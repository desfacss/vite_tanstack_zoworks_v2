import { supabase } from '@/core/lib/supabase';
import { sendEmail } from '../../../services/email/emailService';

export class ESignService {
    // Envelope Operations
    static async getEnvelopes(organizationId: string) {
        const { data, error } = await supabase
            .schema('documents')
            .from('envelopes')
            .select(`
        *,
        recipients (*)
      `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async getEnvelope(id: string) {
        const { data, error } = await supabase
            .schema('documents')
            .from('envelopes')
            .select(`
        *,
        recipients (*),
        signature_fields (*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    static async createEnvelope(envelope: any, recipients: any[], fields: any[]) {
        console.log('--- Creating Envelope ---');
        console.log('Envelope Data:', envelope);
        console.log('Recipients:', recipients.length);
        console.log('Fields:', fields.length);

        // 1. Create Envelope
        const envelopePayload = {
            name: envelope.title || 'Untitled Document',
            description: envelope.description || '',
            status: envelope.status || 'draft',
            state_category: 'NEW',
            organization_id: envelope.organization_id || '00000000-0000-0000-0000-000000000000',
            workflow_type: envelope.workflow_type || 'other',
            expires_at: envelope.expires_at || null,
            requires_signing_order: envelope.requires_signing_order || false
        };

        const { data: env, error: envError } = await supabase
            .schema('documents')
            .from('envelopes')
            .insert(envelopePayload)
            .select()
            .single();

        if (envError) {
            console.error('Envelope creation error:', envError.message, envError.details, envError.hint);
            console.error('Payload attempted:', envelopePayload);
            throw envError;
        }

        // 2. Create Recipients (mapping camelCase to snake_case)
        const recipientsWithEnv = recipients.map(r => ({
            name: r.name,
            email: r.email,
            phone: r.phone || '',
            role: r.role || 'signer',
            signing_order: r.signingOrder || 0,
            auth_method: r.authMethod || 'email',
            envelope_id: env.id,
            organization_id: env.organization_id,
            status: 'pending'
        }));

        const { data: recs, error: recError } = await supabase
            .schema('documents')
            .from('recipients')
            .insert(recipientsWithEnv)
            .select();

        if (recError) {
            console.error('Recipient creation error:', recError.message, recError.details);
            throw recError;
        }

        // 3. Create Fields (mapping temporary recipient emails to real recipient IDs)
        if (!recs) throw new Error('Failed to retrieve created recipients');

        const fieldsWithIds = fields.map(f => {
            const recipient = recs.find(r => r.email === f.recipientId);
            if (!recipient) {
                console.warn(`Warning: Recipient not found for field mapping: ${f.recipientId}`);
            }
            return {
                envelope_id: env.id,
                recipient_id: recipient?.id,
                organization_id: env.organization_id,
                field_type: f.fieldType,
                page_number: f.pageNumber,
                x_position: f.xPosition,
                y_position: f.yPosition,
                width: f.width,
                height: f.height,
                is_required: f.isRequired,
                field_label: f.fieldLabel,
            };
        });

        if (fieldsWithIds.length > 0) {
            const { error: fieldError } = await supabase
                .schema('documents')
                .from('signature_fields')
                .insert(fieldsWithIds);

            if (fieldError) {
                console.error('Field creation error:', fieldError.message, fieldError.details);
                throw fieldError;
            }
        }

        // 4. Send Email Notifications if status is 'sent'
        if (envelope.status === 'sent') {
            try {
                const emails = recipients.map(r => ({
                    from: 'esign@zoworks.ai',
                    to: r.email,
                    subject: `Invitation to sign: ${envelope.title}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                            <h2 style="color: #1a1a1a; margin-top: 0;">You are invited to sign a document</h2>
                            <p style="color: #444; font-size: 16px; line-height: 1.5;">${envelope.title}</p>
                            <p style="color: #666; font-size: 14px;">${envelope.description || ''}</p>
                            <div style="margin: 32px 0;">
                                <a href="${window.location.origin}/esign/sign/${env.id}" 
                                   style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                   Review & Sign Document
                                </a>
                            </div>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
                            <p style="color: #999; font-size: 12px;">This email was sent via zoworks eSign module.</p>
                        </div>
                    `
                }));

                await sendEmail(emails);
            } catch (emailErr) {
                console.error('Failed to send emails, but envelope was created:', emailErr);
            }
        }

        // 5. Log Audit
        try {
            await this.logAudit(env.id, 'created', { title: envelope.title }, undefined, env.organization_id);
        } catch (auditErr) {
            console.warn('Audit logging failed:', auditErr);
        }

        return env;
    }

    static async updateField(fieldId: string, value: string, signatureData?: string) {
        const { error } = await supabase
            .schema('documents')
            .from('signature_fields')
            .update({
                field_value: value,
                signature_data: signatureData,
                completed_at: new Date().toISOString()
            })
            .eq('id', fieldId);

        if (error) throw error;
    }

    static async logAudit(envelopeId: string, action: string, details: any, recipientId?: string, organizationId?: string) {
        await supabase.schema('documents').from('audit_logs').insert({
            envelope_id: envelopeId,
            recipient_id: recipientId,
            organization_id: organizationId,
            action,
            action_details: details,
            timestamp: new Date().toISOString()
        });
    }

    // Real-time Subscriptions
    static subscribeToEnvelope(envelopeId: string, onUpdate: (payload: any) => void) {
        return supabase
            .channel(`envelope:${envelopeId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'documents',
                table: 'signature_fields',
                filter: `envelope_id=eq.${envelopeId}`
            }, onUpdate)
            .subscribe();
    }
}
