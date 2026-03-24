CREATE TABLE catalog.asset_categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    path extensions.ltree,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    organization_id uuid NOT NULL,
    location_id uuid,
    short_code text,
    details__fields__name text GENERATED ALWAYS AS ((details #>> '{fields,name}'::text[])) STORED,
    details__fields__label text GENERATED ALWAYS AS ((details #>> '{fields,label}'::text[])) STORED,
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, ((((COALESCE(name, ''::text) || ' '::text) || COALESCE((details #>> '{fields,name}'::text[]), ''::text)) || ' '::text) || COALESCE((details #>> '{fields,label}'::text[]), ''::text))), 'A'::"char")) STORED
);

CREATE TABLE catalog.bundle_items (
    bundle_id uuid NOT NULL,
    component_offering_id uuid NOT NULL,
    quantity numeric(19,4) DEFAULT 1 NOT NULL,
    sort_order integer,
    is_required boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    version integer DEFAULT 1 NOT NULL
);

CREATE TABLE catalog.discount_rules (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    discount_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    rule_type text NOT NULL,
    target_id uuid,
    min_quantity numeric(19,4),
    max_quantity numeric(19,4),
    min_order_value numeric(19,4),
    max_order_value numeric(19,4),
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT chk_rule_order_value_range CHECK (((min_order_value IS NULL) OR (max_order_value IS NULL) OR (min_order_value <= max_order_value))),
    CONSTRAINT chk_rule_quantity_range CHECK (((min_quantity IS NULL) OR (max_quantity IS NULL) OR (min_quantity <= max_quantity))),
    CONSTRAINT chk_rule_type CHECK ((rule_type = ANY (ARRAY['offering'::text, 'category'::text, 'customer_segment'::text, 'location'::text, 'total_order_value'::text, 'payment_method'::text, 'shipping_method'::text])))
);

CREATE TABLE catalog.discounts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    short_code text,
    description text,
    type text NOT NULL,
    value numeric(19,4) NOT NULL,
    max_discount_amount numeric(19,4),
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    is_active boolean DEFAULT true,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT chk_discount_type CHECK ((type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text, 'buy_x_get_y_free'::text, 'buy_x_get_y_discount'::text, 'free_shipping'::text])))
);

CREATE TABLE catalog.inventory_levels (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    offering_variant_id uuid NOT NULL,
    location_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    reorder_point integer DEFAULT 0,
    last_counted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    version integer DEFAULT 1 NOT NULL
);

CREATE TABLE catalog.offering_bundles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    offering_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    quantity integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    display_id character varying(200),
    external_id text,
    version integer DEFAULT 1 NOT NULL
);

CREATE TABLE catalog.offering_categories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    parent_id uuid,
    name text NOT NULL,
    short_code text,
    path extensions.ltree,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    version integer DEFAULT 1 NOT NULL
);

CREATE TABLE catalog.offering_prices (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    offering_id uuid NOT NULL,
    offering_variant_id uuid,
    price_list_id uuid NOT NULL,
    currency text NOT NULL,
    amount numeric(19,4) NOT NULL,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    location_id uuid,
    customer_segment_id uuid,
    min_quantity numeric(19,4) DEFAULT 1,
    max_quantity numeric(19,4),
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT chk_quantity_range CHECK (((min_quantity IS NULL) OR (max_quantity IS NULL) OR (min_quantity <= max_quantity)))
);

CREATE TABLE catalog.offering_variants (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    offering_id uuid NOT NULL,
    sku text NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    price_override numeric(19,4),
    cost_override numeric(19,4),
    is_active boolean DEFAULT true,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    display_id character varying(200),
    external_id text,
    version integer DEFAULT 1 NOT NULL
);

CREATE TABLE catalog.offerings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    short_code text NOT NULL,
    type text NOT NULL,
    description text,
    short_description text,
    unit_of_measure text,
    is_active boolean DEFAULT true,
    is_physical boolean DEFAULT false,
    is_digital boolean DEFAULT false,
    is_service boolean DEFAULT false,
    is_configurable boolean DEFAULT false,
    is_inventory_tracked boolean DEFAULT false,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    display_id character varying(200),
    external_id text,
    version integer DEFAULT 1 NOT NULL,
    entity_instance_id uuid,
    gtin text,
    mpn text,
    brand text,
    weight numeric(10,2),
    weight_unit text DEFAULT 'kg'::text,
    dimensions jsonb,
    return_policy jsonb,
    certifications jsonb,
    country_of_origin text,
    hs_code text,
    enable_checkout boolean DEFAULT true,
    popularity_score integer,
    return_rate numeric(5,4),
    CONSTRAINT chk_offering_type CHECK ((type = ANY (ARRAY['product'::text, 'service'::text, 'digital'::text, 'custom'::text, 'subscription'::text, 'bundle'::text]))),
    CONSTRAINT offerings_popularity_score_check CHECK (((popularity_score >= 1) AND (popularity_score <= 5)))
);

CREATE TABLE catalog.price_lists (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    short_code text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    valid_from timestamp with time zone,
    valid_to timestamp with time zone,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

CREATE TABLE catalog.product_qna (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    offering_id uuid NOT NULL,
    question text NOT NULL,
    answer text,
    is_automated boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY catalog.asset_categories
    ADD CONSTRAINT asset_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.bundle_items
    ADD CONSTRAINT bundle_items_pkey PRIMARY KEY (bundle_id, component_offering_id);

ALTER TABLE ONLY catalog.discount_rules
    ADD CONSTRAINT discount_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.discounts
    ADD CONSTRAINT discounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.inventory_levels
    ADD CONSTRAINT inventory_levels_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.offering_bundles
    ADD CONSTRAINT offering_bundles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.offering_categories
    ADD CONSTRAINT offering_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.offering_prices
    ADD CONSTRAINT offering_prices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.offering_variants
    ADD CONSTRAINT offering_variants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.offerings
    ADD CONSTRAINT offerings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.price_lists
    ADD CONSTRAINT price_lists_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.product_qna
    ADD CONSTRAINT product_qna_pkey PRIMARY KEY (id);

ALTER TABLE ONLY catalog.asset_categories
    ADD CONSTRAINT asset_categories_org_name_loc_parent_unique UNIQUE (organization_id, location_id, parent_id, name);

ALTER TABLE ONLY catalog.bundle_items
    ADD CONSTRAINT bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES catalog.offering_bundles(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.bundle_items
    ADD CONSTRAINT bundle_items_component_offering_id_fkey FOREIGN KEY (component_offering_id) REFERENCES catalog.offerings(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.discount_rules
    ADD CONSTRAINT discount_rules_discount_id_fkey FOREIGN KEY (discount_id) REFERENCES catalog.discounts(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.discounts
    ADD CONSTRAINT uq_discounts_org_short_code UNIQUE (organization_id, short_code);

ALTER TABLE ONLY catalog.inventory_levels
    ADD CONSTRAINT inventory_levels_offering_variant_id_fkey FOREIGN KEY (offering_variant_id) REFERENCES catalog.offering_variants(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.inventory_levels
    ADD CONSTRAINT unique_variant_location_inventory UNIQUE (offering_variant_id, location_id, organization_id);

ALTER TABLE ONLY catalog.offering_bundles
    ADD CONSTRAINT offering_bundles_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES catalog.offerings(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.offering_bundles
    ADD CONSTRAINT uq_offering_bundle_offering UNIQUE (offering_id);

ALTER TABLE ONLY catalog.offering_bundles
    ADD CONSTRAINT uq_offering_bundles_display_id UNIQUE (organization_id, display_id);

ALTER TABLE ONLY catalog.offering_bundles
    ADD CONSTRAINT uq_offering_bundles_external_id UNIQUE (organization_id, external_id);

ALTER TABLE ONLY catalog.offering_categories
    ADD CONSTRAINT offering_categories_code_key UNIQUE (short_code);

ALTER TABLE ONLY catalog.offering_categories
    ADD CONSTRAINT offering_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES catalog.offering_categories(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.offering_categories
    ADD CONSTRAINT uq_offering_category_org_parent_name UNIQUE (organization_id, parent_id, name);

ALTER TABLE ONLY catalog.offering_prices
    ADD CONSTRAINT offering_prices_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES catalog.offerings(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.offering_prices
    ADD CONSTRAINT offering_prices_offering_variant_id_fkey FOREIGN KEY (offering_variant_id) REFERENCES catalog.offering_variants(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.offering_prices
    ADD CONSTRAINT offering_prices_price_list_id_fkey FOREIGN KEY (price_list_id) REFERENCES catalog.price_lists(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.offering_prices
    ADD CONSTRAINT uq_offering_price_dimensions UNIQUE (offering_id, offering_variant_id, price_list_id, currency, organization_id, location_id, customer_segment_id, min_quantity, valid_from);

ALTER TABLE ONLY catalog.offering_variants
    ADD CONSTRAINT offering_variants_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES catalog.offerings(id) ON DELETE CASCADE;

ALTER TABLE ONLY catalog.offering_variants
    ADD CONSTRAINT uq_offering_variant_sku UNIQUE (organization_id, sku);

ALTER TABLE ONLY catalog.offering_variants
    ADD CONSTRAINT uq_offering_variants_display_id UNIQUE (organization_id, display_id);

ALTER TABLE ONLY catalog.offering_variants
    ADD CONSTRAINT uq_offering_variants_external_id UNIQUE (organization_id, external_id);

ALTER TABLE ONLY catalog.offerings
    ADD CONSTRAINT offerings_category_id_fkey FOREIGN KEY (category_id) REFERENCES catalog.offering_categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY catalog.offerings
    ADD CONSTRAINT offerings_entity_instance_id_fkey FOREIGN KEY (entity_instance_id) REFERENCES crm.entity_instances(id);

ALTER TABLE ONLY catalog.offerings
    ADD CONSTRAINT offerings_entity_instance_id_key UNIQUE (entity_instance_id);

ALTER TABLE ONLY catalog.offerings
    ADD CONSTRAINT uq_offering_org_code UNIQUE (organization_id, short_code);

ALTER TABLE ONLY catalog.offerings
    ADD CONSTRAINT uq_offerings_display_id UNIQUE (organization_id, display_id);

ALTER TABLE ONLY catalog.offerings
    ADD CONSTRAINT uq_offerings_external_id UNIQUE (organization_id, external_id);

ALTER TABLE ONLY catalog.price_lists
    ADD CONSTRAINT uq_price_list_org_short_code UNIQUE (organization_id, short_code);

ALTER TABLE ONLY catalog.product_qna
    ADD CONSTRAINT product_qna_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES catalog.offerings(id) ON DELETE CASCADE;

CREATE INDEX categories_details_gin ON catalog.asset_categories USING gin (details);

CREATE INDEX categories_parent_id_idx ON catalog.asset_categories USING btree (parent_id);

CREATE INDEX categories_path_gist_idx ON catalog.asset_categories USING gist (path);

CREATE INDEX idx_asset_categories_hierarchy_path ON catalog.asset_categories USING gist (path);

CREATE INDEX idx_asset_categories_search_vec ON catalog.asset_categories USING gin (search_vector);

CREATE INDEX idx_asset_categories_universal_timeline ON catalog.asset_categories USING btree (organization_id, created_at DESC, id) INCLUDE (id, organization_id, created_at);

CREATE INDEX idx_bundle_items_component_offering_id ON catalog.bundle_items USING btree (component_offering_id);

CREATE INDEX idx_bundle_items_org_id ON catalog.bundle_items USING btree (organization_id);

CREATE INDEX idx_discount_rules_discount_id ON catalog.discount_rules USING btree (discount_id);

CREATE INDEX idx_discount_rules_org_id ON catalog.discount_rules USING btree (organization_id);

CREATE INDEX idx_discount_rules_rule_type ON catalog.discount_rules USING btree (rule_type);

CREATE INDEX idx_discount_rules_target_id ON catalog.discount_rules USING btree (target_id);

CREATE INDEX idx_discounts_org_id ON catalog.discounts USING btree (organization_id);

CREATE INDEX idx_discounts_short_code ON catalog.discounts USING btree (short_code);

CREATE INDEX idx_discounts_valid_from_to ON catalog.discounts USING btree (valid_from, valid_to);

CREATE INDEX idx_inventory_levels_location_id ON catalog.inventory_levels USING btree (location_id);

CREATE INDEX idx_inventory_levels_organization_id ON catalog.inventory_levels USING btree (organization_id);

CREATE INDEX idx_inventory_levels_variant_id ON catalog.inventory_levels USING btree (offering_variant_id);

CREATE INDEX idx_offering_bundles_org_id ON catalog.offering_bundles USING btree (organization_id);

CREATE INDEX idx_offering_categories_name ON catalog.offering_categories USING btree (name);

CREATE INDEX idx_offering_categories_org_id ON catalog.offering_categories USING btree (organization_id);

CREATE INDEX idx_offering_categories_path_btree_idx ON catalog.offering_categories USING btree (path);

CREATE INDEX idx_offering_categories_path_gist_idx ON catalog.offering_categories USING gist (path);

CREATE INDEX idx_offering_prices_customer_segment_id ON catalog.offering_prices USING btree (customer_segment_id);

CREATE INDEX idx_offering_prices_location_id ON catalog.offering_prices USING btree (location_id);

CREATE INDEX idx_offering_prices_offering_id ON catalog.offering_prices USING btree (offering_id);

CREATE INDEX idx_offering_prices_org_id ON catalog.offering_prices USING btree (organization_id);

CREATE INDEX idx_offering_prices_price_list_id ON catalog.offering_prices USING btree (price_list_id);

CREATE INDEX idx_offering_prices_valid_from_to ON catalog.offering_prices USING btree (valid_from, valid_to);

CREATE INDEX idx_offering_prices_variant_id ON catalog.offering_prices USING btree (offering_variant_id);

CREATE INDEX idx_offering_variants_offering_id ON catalog.offering_variants USING btree (offering_id);

CREATE INDEX idx_offering_variants_org_id ON catalog.offering_variants USING btree (organization_id);

CREATE INDEX idx_offering_variants_sku ON catalog.offering_variants USING btree (sku);

CREATE INDEX idx_offerings_category_id ON catalog.offerings USING btree (category_id);

CREATE INDEX idx_offerings_code ON catalog.offerings USING btree (short_code);

CREATE INDEX idx_offerings_gtin ON catalog.offerings USING btree (gtin) WHERE (gtin IS NOT NULL);

CREATE INDEX idx_offerings_org_id ON catalog.offerings USING btree (organization_id);

CREATE INDEX idx_offerings_type ON catalog.offerings USING btree (type);

CREATE INDEX idx_price_lists_org_id ON catalog.price_lists USING btree (organization_id);

CREATE INDEX idx_price_lists_short_code ON catalog.price_lists USING btree (short_code);

CREATE INDEX idx_product_qna_offering ON catalog.product_qna USING btree (offering_id);

CREATE POLICY "Tenant_Isolation_V5" ON catalog.asset_categories TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.bundle_items TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.discount_rules TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.discounts TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.inventory_levels TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.offering_bundles TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.offering_categories TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.offering_prices TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.offering_variants TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.offerings TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE POLICY "Tenant_Isolation_V5" ON catalog.price_lists TO authenticated USING ((organization_id = identity.get_current_org_id()));

CREATE TRIGGER trg_set_display_id BEFORE INSERT ON catalog.offering_bundles FOR EACH ROW EXECUTE FUNCTION core.core_trigger_set_display_id_v3();

CREATE TRIGGER trg_set_display_id BEFORE INSERT ON catalog.offering_variants FOR EACH ROW EXECUTE FUNCTION core.core_trigger_set_display_id_v3();

CREATE TRIGGER trg_set_display_id BEFORE INSERT ON catalog.offerings FOR EACH ROW EXECUTE FUNCTION core.core_trigger_set_display_id_v3();

CREATE TRIGGER trg_sys_register_unified_object AFTER INSERT ON catalog.offering_bundles FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();

CREATE TRIGGER trg_sys_register_unified_object AFTER INSERT ON catalog.offerings FOR EACH ROW EXECUTE FUNCTION core.sys_trg_register_unified_object();

CREATE TRIGGER update_asset_categories_updated_at BEFORE UPDATE ON catalog.asset_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_category_path_trigger BEFORE INSERT OR UPDATE OF parent_id, name, short_code ON catalog.asset_categories FOR EACH ROW EXECUTE FUNCTION core.update_category_path();

CREATE TRIGGER update_bundle_items_updated_at BEFORE UPDATE ON catalog.bundle_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON catalog.asset_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discount_rules_updated_at BEFORE UPDATE ON catalog.discount_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON catalog.discounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_levels_updated_at BEFORE UPDATE ON catalog.inventory_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offering_bundles_updated_at BEFORE UPDATE ON catalog.offering_bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offering_categories_updated_at BEFORE UPDATE ON catalog.offering_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offering_category_path_trigger BEFORE INSERT OR UPDATE OF parent_id, name, short_code ON catalog.offering_categories FOR EACH ROW EXECUTE FUNCTION core.update_category_path();

CREATE TRIGGER update_offering_prices_updated_at BEFORE UPDATE ON catalog.offering_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offering_variants_updated_at BEFORE UPDATE ON catalog.offering_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offerings_updated_at BEFORE UPDATE ON catalog.offerings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_lists_updated_at BEFORE UPDATE ON catalog.price_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE FUNCTION catalog."x_OLD_wff_core_process_event_queue_notusedatall"() RETURNS void
    LANGUAGE plpgsql
    AS $_$-- DECLARE
DECLARE
    event RECORD;
    workflow RECORD;
    action RECORD;
    event_processing_start_time TIMESTAMPTZ;
    event_processing_duration INTEGER;
    workflow_execution_error TEXT;
    conditions_met BOOLEAN;
BEGIN
    FOR event IN
        SELECT * FROM wf_events
        WHERE status = 'pending' AND retry_count <= 3
        FOR UPDATE SKIP LOCKED
    LOOP
        event_processing_start_time := clock_timestamp();
        workflow_execution_error := NULL;
        FOR workflow IN
            SELECT * FROM wf_workflows
            WHERE (organization_id = event.organization_id OR event.organization_id IS NULL)
              AND trigger_table = event.trigger_table
              AND (trigger_type = event.trigger_type OR trigger_type = 'both')
              AND is_active = TRUE
            ORDER BY priority DESC
        LOOP
            conditions_met := FALSE;
            BEGIN
                IF workflow.conditions IS NULL OR jsonb_array_length(workflow.conditions) = 0 THEN
                    conditions_met := TRUE;
                ELSIF workflow.condition_type = 'sql' THEN
                    conditions_met := wff_utils_evaluate_sql_condition(workflow.conditions->>'sql', event.trigger_data);
                ELSE
                    conditions_met := TRUE;
                END IF;
                IF conditions_met THEN
                    FOR action IN
                        SELECT act.*
                        FROM jsonb_array_elements_text(workflow.actions) AS action_ids(id)
                        JOIN wf_actions AS act ON act.id = (action_ids.id)::uuid
                        WHERE act.is_enabled = TRUE
                        ORDER BY act.action_order
                    LOOP
                        PERFORM wff_core_dispatch_action(
                            action.id,
                            event.trigger_data || jsonb_build_object(
                                'event_id', event.id,
                                'workflow_id', workflow.id,
                                'action_id', action.id
                            )
                        );
                    END LOOP;
                    UPDATE wf_workflows SET last_executed_at = NOW() WHERE id = workflow.id;
                ELSE
                    INSERT INTO wf_logs (organization_id, workflow_id, event_id, trigger_data, conditions_checked, status, error_message, log_level)
                    VALUES (event.organization_id, workflow.id, event.id, event.trigger_data, workflow.conditions, 'skipped', 'Condition not met', 'info');
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    DECLARE
                        v_error_message TEXT;
                        v_error_context TEXT;
                    BEGIN
                        GET STACKED DIAGNOSTICS
                            v_error_message = MESSAGE_TEXT,
                            v_error_context = PG_EXCEPTION_CONTEXT;
                        workflow_execution_error := format('Message: %s || Context: %s', v_error_message, v_error_context);
                    END;
                    INSERT INTO wf_logs (organization_id, workflow_id, event_id, trigger_data, status, error_message, context, log_level)
                    VALUES (event.organization_id, workflow.id, event.id, event.trigger_data, 'failed', workflow_execution_error, jsonb_build_object('error_source', 'wff_core_process_event_queue_loop'), 'error');
            END;
        END LOOP;
        IF workflow_execution_error IS NOT NULL THEN
            UPDATE wf_events SET status = 'failed', error_message = COALESCE(event.error_message, '') || ' | ' || workflow_execution_error, retry_count = event.retry_count + 1, processed_at = NOW() WHERE id = event.id;
        ELSE
            UPDATE wf_events SET status = 'processed', processed_at = NOW() WHERE id = event.id;
        END IF;
        event_processing_duration := EXTRACT(EPOCH FROM (clock_timestamp() - event_processing_start_time)) * 1000;
        INSERT INTO wf_logs (organization_id, event_id, trigger_data, status, duration_ms, log_level)
        VALUES (event.organization_id, event.id, event.trigger_data, CASE WHEN workflow_execution_error IS NOT NULL THEN 'failed' ELSE 'success' END, event_processing_duration, CASE WHEN workflow_execution_error IS NOT NULL THEN 'error' ELSE 'info' END);
    END LOOP;
END;$_$;

CREATE FUNCTION catalog."x_WRK_wff_core_process_event_queue"(p_event_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$DECLARE
    event RECORD;
    workflow RECORD;
    action RECORD;
    event_processing_start_time TIMESTAMPTZ;
    event_processing_duration INTEGER;
    workflow_execution_error TEXT;
    conditions_met BOOLEAN;
BEGIN
    FOR event IN
        SELECT * FROM wf_events
        WHERE id = p_event_id AND status = 'pending'
        FOR UPDATE SKIP LOCKED
    LOOP
        event_processing_start_time := clock_timestamp();
        workflow_execution_error := NULL;
        FOR workflow IN
            SELECT * FROM wf_workflows
            WHERE (organization_id = event.organization_id OR event.organization_id IS NULL)
              AND trigger_table = event.trigger_table
              AND (trigger_type = event.trigger_type OR trigger_type = 'both')
              AND is_active = TRUE
            ORDER BY priority DESC
        LOOP
            conditions_met := FALSE;
            BEGIN
                IF workflow.conditions IS NULL OR workflow.conditions = '{}'::jsonb THEN
                    conditions_met := TRUE;
                ELSIF workflow.condition_type = 'sql' THEN
                    conditions_met := wff_utils_evaluate_sql_condition(workflow.conditions->>'sql', event.trigger_data);
                ELSE
                    conditions_met := TRUE; -- Placeholder
                END IF;
                IF conditions_met THEN
                    FOR action IN
                        SELECT act.*
                        FROM jsonb_array_elements_text(workflow.actions) AS action_ids(id)
                        JOIN wf_actions AS act ON act.id = (action_ids.id)::uuid
                        WHERE act.is_enabled = TRUE
                        ORDER BY act.action_order
                    LOOP
                        PERFORM wff_core_dispatch_action(action.id, event.trigger_data || jsonb_build_object('event_id', event.id, 'workflow_id', workflow.id, 'action_id', action.id));
                    END LOOP;
                    UPDATE wf_workflows SET last_executed_at = NOW() WHERE id = workflow.id;
                ELSE
                    INSERT INTO wf_logs (organization_id, workflow_id, event_id, trigger_data, conditions_checked, status, error_message, log_level)
                    VALUES (event.organization_id, workflow.id, event.id, event.trigger_data, workflow.conditions, 'skipped', 'Condition not met', 'info');
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    DECLARE v_error_message TEXT; v_error_context TEXT;
                    BEGIN
                        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT, v_error_context = PG_EXCEPTION_CONTEXT;
                        workflow_execution_error := format('Message: %s || Context: %s', v_error_message, v_error_context);
                        INSERT INTO wf_logs (organization_id, workflow_id, event_id, trigger_data, status, error_message, context, log_level)
                        VALUES (event.organization_id, workflow.id, event.id, event.trigger_data, 'failed', workflow_execution_error, jsonb_build_object('error_source', 'wff_core_process_event_queue_loop'), 'error');
                    END;
            END;
        END LOOP;
        IF workflow_execution_error IS NOT NULL THEN
            UPDATE wf_events SET status = 'failed', error_message = COALESCE(event.error_message, '') || ' | ' || workflow_execution_error, retry_count = event.retry_count + 1, processed_at = NOW() WHERE id = event.id;
        ELSE
            UPDATE wf_events SET status = 'processed', processed_at = NOW() WHERE id = event.id;
        END IF;
        event_processing_duration := EXTRACT(EPOCH FROM (clock_timestamp() - event_processing_start_time)) * 1000;
        INSERT INTO wf_logs (organization_id, event_id, trigger_data, status, duration_ms, log_level)
        VALUES (event.organization_id, event.id, event.trigger_data, CASE WHEN workflow_execution_error IS NOT NULL THEN 'failed' ELSE 'success' END, event_processing_duration, CASE WHEN workflow_execution_error IS NOT NULL THEN 'error' ELSE 'info' END);
    END LOOP;
END;$$;

CREATE FUNCTION catalog.x______wff_smart_assign_task(config jsonb, trigger_data jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$DECLARE
    task_title TEXT := config->>'task_title';
    assignee_id TEXT := config->>'assignee_id';
BEGIN
    IF task_title IS NULL OR assignee_id IS NULL THEN
        RAISE EXCEPTION 'Invalid configuration: task_title or assignee_id missing';
    END IF;
    INSERT INTO tasks (title, assignee_id, status, created_at)
    VALUES (task_title, assignee_id, 'pending', NOW());
END;$$;

CREATE FUNCTION catalog.x_disposable_utils_get_entity_workflow_thread_supabase(p_entity_type text, p_entity_id uuid) RETURNS TABLE("Timestamp (IST)" text, "Source" text, "Action / Event Description" text, "Status" text)
    LANGUAGE plpgsql
    AS $$BEGIN
    RETURN QUERY
    WITH all_events AS (
        SELECT
            to_char(q.created_at, 'HH24:MI:SS') AS event_time,
            'Database Trigger' AS source,
            CASE
                WHEN q.trigger_event = 'INSERT' THEN 'Event queued for ticket creation.'
                ELSE 'Event queued for ticket update (' || COUNT(*) || ' times).'
            END AS action_description,
            '✅ ' || q.status AS status
        FROM workflow.dynamic_workflow_queue q
        WHERE q.entity_type = p_entity_type AND q.entity_id = p_entity_id
        GROUP BY q.created_at, q.trigger_event, q.status
        UNION ALL
        SELECT
            to_char(i.created_at, 'HH24:MI:SS') AS event_time,
            'Workflow Engine' AS source,
            'Workflow instance was started.' AS action_description,
            '➡️ ' || i.status AS status
        FROM workflow.dynamic_workflow_instances i
        WHERE i.entity_type = p_entity_type AND i.entity_id = p_entity_id
        UNION ALL
        SELECT
            to_char(e.processed_at, 'HH24:MI:SS') AS event_time,
            'Event Processor' AS source,
            'System processed the workflow trigger.' AS action_description,
            '✅ ' || e.status AS status
        FROM workflow.wf_events e
        WHERE e.context_entity_type = p_entity_type AND e.context_entity_id = p_entity_id AND e.processed_at IS NOT NULL
        UNION ALL
        SELECT
            to_char(l.created_at, 'HH24:MI:SS') AS event_time,
            'Logger' AS source,
            'Event execution was logged.' AS action_description,
            '✅ ' || l.status AS status
        FROM workflow.wf_logs l
        INNER JOIN workflow.wf_events e ON e.id = l.event_id
        WHERE e.context_entity_type = p_entity_type AND e.context_entity_id = p_entity_id
    )
    SELECT *
    FROM all_events
    ORDER BY event_time ASC, source DESC;
END;$$;

CREATE FUNCTION catalog.x_old_aug_wf_process_events_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN
    IF NEW.status = 'pending' THEN
        PERFORM workflow.wf_process_events();
    END IF;
    RETURN NEW;
END;$$;

CREATE FUNCTION catalog.x_old_aug_wf_process_events() RETURNS void
    LANGUAGE plpgsql
    AS $_$DECLARE
    event RECORD;
    workflow RECORD;
    action RECORD;
    event_processing_start_time TIMESTAMPTZ;
    event_processing_duration INTEGER;
    workflow_execution_error TEXT;
    conditions_met BOOLEAN;
    condition_key TEXT;
    condition_rule JSONB;
    actual_value JSONB;
    expected_value JSONB;
    change JSONB;
    field_path TEXT;
BEGIN
    FOR event IN SELECT * FROM workflow.wf_events WHERE status = 'pending' AND retry_count <= 3 FOR UPDATE SKIP LOCKED LOOP
        event_processing_start_time := clock_timestamp();
        workflow_execution_error := NULL;
        FOR workflow IN SELECT * FROM workflow.wf_workflows WHERE (organization_id = event.organization_id OR event.organization_id IS NULL) AND trigger_table = event.trigger_table AND (trigger_type = event.trigger_type OR trigger_type = 'both') AND is_active = TRUE ORDER BY priority DESC LOOP
            conditions_met := FALSE;
            BEGIN
                IF workflow.conditions IS NULL OR workflow.conditions = '{}'::jsonb THEN conditions_met := TRUE;
                ELSIF workflow.condition_type = 'sql' THEN conditions_met := public.wf_evaluate_sql_condition(workflow.conditions->>'sql', event.trigger_data);
                ELSE
                    IF workflow.conditions->>'fields' IS NOT NULL AND event.trigger_type = 'on_update' THEN
                        FOR change IN SELECT jsonb_array_elements(event.trigger_data->'changes') LOOP
                            FOR field_path IN SELECT jsonb_array_elements_text(workflow.conditions->'fields') LOOP
                                IF change->>'path' = field_path THEN conditions_met := TRUE; EXIT; END IF;
                            END LOOP;
                            IF conditions_met THEN EXIT; END IF;
                        END LOOP;
                    ELSE
                        conditions_met := TRUE;
                        FOR condition_key, condition_rule IN SELECT * FROM jsonb_each(workflow.conditions) LOOP
                            actual_value := public.wf_find_jsonb_value_recursive(event.trigger_data, condition_key);
                            IF condition_rule ? '$eq' THEN
                                expected_value := condition_rule -> '$eq';
                                IF actual_value IS DISTINCT FROM expected_value THEN conditions_met := FALSE; EXIT; END IF;
                            ELSE conditions_met := FALSE; EXIT; END IF;
                        END LOOP;
                    END IF;
                END IF;
                IF conditions_met THEN
                    FOR action IN SELECT * FROM workflow.wf_actions WHERE workflow_id = workflow.id AND is_enabled = TRUE ORDER BY action_order LOOP
                        PERFORM public.wf_execute_action(action.id, event.trigger_data || jsonb_build_object('event_id', event.id, 'workflow_id', workflow.id, 'action_id', action.id));
                    END LOOP;
                    UPDATE workflow.wf_workflows SET last_executed_at = NOW() WHERE id = workflow.id;
                ELSE
                    INSERT INTO workflow.wf_logs (organization_id, workflow_id, event_id, trigger_data, conditions_checked, status, error_message, log_level)
                    VALUES (event.organization_id, workflow.id, event.id, event.trigger_data, workflow.conditions, 'skipped', 'Condition not met', 'info');
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    DECLARE
                        v_error_message TEXT;
                        v_error_context TEXT;
                    BEGIN
                        GET STACKED DIAGNOSTICS
                            v_error_message = MESSAGE_TEXT,
                            v_error_context = PG_EXCEPTION_CONTEXT;
                        workflow_execution_error := format('Message: %s || Context: %s', v_error_message, v_error_context);
                    END;
                    INSERT INTO workflow.wf_logs (organization_id, workflow_id, event_id, trigger_data, status, error_message, context, log_level)
                    VALUES (event.organization_id, workflow.id, event.id, event.trigger_data, 'failed', workflow_execution_error, jsonb_build_object('error_source', 'wf_process_events_workflow_loop'), 'error');
            END; 
        END LOOP; 
        IF workflow_execution_error IS NOT NULL THEN
            UPDATE workflow.wf_events SET status = 'failed', error_message = COALESCE(event.error_message, '') || ' | ' || workflow_execution_error, retry_count = event.retry_count + 1, processed_at = NOW() WHERE id = event.id;
        ELSE
            UPDATE workflow.wf_events SET status = 'processed', processed_at = NOW() WHERE id = event.id;
        END IF;
        event_processing_duration := EXTRACT(EPOCH FROM (clock_timestamp() - event_processing_start_time)) * 1000;
        INSERT INTO workflow.wf_logs (organization_id, event_id, trigger_data, status, duration_ms, log_level)
        VALUES (event.organization_id, event.id, event.trigger_data, CASE WHEN workflow_execution_error IS NOT NULL THEN 'failed' ELSE 'success' END, event_processing_duration, CASE WHEN workflow_execution_error IS NOT NULL THEN 'error' ELSE 'info' END);
    END LOOP;
END;$_$;

CREATE FUNCTION catalog.x_old_wff_utils_jsonb_to_update_clause(fields jsonb) RETURNS text
    LANGUAGE plpgsql
    AS $$DECLARE
    field TEXT;
    value TEXT;
    clause TEXT := '';
BEGIN
    FOR field, value IN SELECT key, value FROM jsonb_each(fields)
    LOOP
        clause := clause || format('%I = %L, ', field, value);
    END LOOP;
    RETURN RTRIM(clause, ', ');
END;$$;

CREATE FUNCTION catalog.x_wff_core_capture_event_trigger1() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE
    event_type TEXT;
    event_data JSONB;
    v_event_id UUID := extensions.uuid_generate_v4();
    v_organization_id UUID;
    v_changes JSONB;
    v_context_entity_id UUID;
    v_context_entity_type TEXT;
BEGIN
    v_context_entity_id := NEW.id; -- Assumes all tables have an 'id' primary key
    v_context_entity_type := TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;
    IF TG_OP = 'INSERT' THEN
        event_type := 'on_create';
        v_organization_id := NEW.organization_id;
        event_data := jsonb_build_object(
            'new', to_jsonb(NEW),
            'event_id', v_event_id,
            'organization_id', v_organization_id,
            'trigger_table', TG_TABLE_NAME,
            'trigger_type', event_type
        );
    ELSIF TG_OP = 'UPDATE' THEN
        event_type := 'on_update';
        v_organization_id := NEW.organization_id;
        v_changes := wff_utils_jsonb_diff(to_jsonb(OLD), to_jsonb(NEW));
        event_data := jsonb_build_object(
            'new', to_jsonb(NEW),
            'old', to_jsonb(OLD),
            'changes', v_changes,
            'event_id', v_event_id,
            'organization_id', v_organization_id,
            'trigger_table', TG_TABLE_NAME,
            'trigger_type', event_type
        );
    ELSE
        RETURN OLD;
    END IF;
    INSERT INTO wf_events (
        id, organization_id, trigger_table, trigger_type, trigger_data, status,
        context_entity_id, context_entity_type
    ) VALUES (
        v_event_id,
        v_organization_id,
        TG_TABLE_NAME,
        event_type,
        event_data,
        'pending',
        v_context_entity_id,
        v_context_entity_type
    );
    RETURN NEW;
END;$$;

CREATE FUNCTION catalog.x_wff_core_dispatch_action1(action_id uuid, trigger_data jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$-- -- DECLARE
DECLARE
    action wf_actions%ROWTYPE;
    error_message TEXT;
    v_workflow_id UUID;
BEGIN
    BEGIN
        SELECT * INTO action FROM wf_actions WHERE id = action_id;
        IF action.id IS NULL THEN
            RAISE WARNING 'Action ID % not found. Skipping execution.', action_id;
            RETURN;
        END IF;
        v_workflow_id := (trigger_data->>'workflow_id')::UUID;
        IF action.rate_limit IS NOT NULL AND NOT wff_utils_check_rate_limit(action) THEN
            RAISE EXCEPTION 'Rate limit exceeded for action %', action.id;
        END IF;
        CASE action.action_type
            WHEN 'send_email' THEN
                PERFORM wff_smart_send_email(action.configuration, trigger_data);
            WHEN 'create_task' THEN
                PERFORM wff_smart_create_task(action.configuration, trigger_data);
            WHEN 'assign_owner' THEN
                PERFORM wff_smart_assign_owner(action.configuration, trigger_data);
            WHEN 'create_activity' THEN
                PERFORM wff_smart_create_activity(action.configuration, trigger_data);
            WHEN 'create_record' THEN
                PERFORM wff_smart_create_record(action.configuration, trigger_data);
            WHEN 'update_fields' THEN
                PERFORM wff_smart_update_fields(action.configuration, trigger_data);
            ELSE
                RAISE WARNING 'Unknown action type: % for action ID %', action.action_type, action.id;
        END CASE;
        INSERT INTO wf_logs (
            organization_id, workflow_id, action_id, event_id,
            trigger_data, actions_executed, status, context, log_level
        )
        VALUES (
            (SELECT organization_id FROM wf_workflows WHERE id = v_workflow_id),
            v_workflow_id,
            action.id,
            (trigger_data->>'event_id')::UUID,
            trigger_data,
            action.configuration,
            'success',
            jsonb_build_object('action_name', action.name, 'action_type', action.action_type),
            'info'
        );
    EXCEPTION
        WHEN OTHERS THEN
            DECLARE
                v_error_message TEXT;
                v_error_context TEXT;
                v_current_retry_count INTEGER;
                v_max_retries INTEGER;
            BEGIN
                GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT, v_error_context = PG_EXCEPTION_CONTEXT;
                error_message := format('Message: %s || Context: %s', v_error_message, v_error_context);
                v_current_retry_count := COALESCE((trigger_data->>'retry_count')::INTEGER, 0) + 1;
                v_max_retries := COALESCE(action.max_retries, 3);
                INSERT INTO wf_logs (
                    organization_id, workflow_id, action_id, event_id,
                    trigger_data, status, error_message, context, log_level
                )
                VALUES (
                    (SELECT organization_id FROM wf_workflows WHERE id = v_workflow_id),
                    v_workflow_id, action.id, (trigger_data->>'event_id')::UUID,
                    trigger_data, 'failed', error_message,
                    jsonb_build_object('action_name', action.name, 'action_type', action.action_type, 'retry_attempt', v_current_retry_count),
                    'error'
                );
                IF v_current_retry_count <= v_max_retries THEN
                    PERFORM wff_core_schedule_retry(v_workflow_id, action.id, NULL, trigger_data || jsonb_build_object('retry_count', v_current_retry_count, 'last_error', error_message));
                ELSE
                    PERFORM wff_utils_notify_on_error(v_workflow_id, v_current_retry_count, 'Max retries exceeded for action ' || action.id::TEXT || ': ' || error_message);
                END IF;
                RAISE EXCEPTION 'Action failed: %', error_message;
            END;
    END;
END;$$;

CREATE FUNCTION catalog.x_wff_core_process_event_queue1(p_event_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $_$DECLARE
    event RECORD;
    workflow RECORD;
    action RECORD;
    event_processing_start_time TIMESTAMPTZ;
    event_processing_duration INTEGER;
    workflow_execution_error TEXT;
    conditions_met BOOLEAN;
    condition_key TEXT;
    condition_rule JSONB;
    actual_value JSONB;
    expected_value JSONB;
    change JSONB;
    field_path TEXT;
BEGIN
    FOR event IN
        SELECT * FROM wf_events
        WHERE id = p_event_id AND status = 'pending'
        FOR UPDATE SKIP LOCKED
    LOOP
        event_processing_start_time := clock_timestamp();
        workflow_execution_error := NULL;
        FOR workflow IN
            SELECT * FROM wf_workflows
            WHERE (organization_id = event.organization_id OR event.organization_id IS NULL)
              AND trigger_table = event.trigger_table
              AND (trigger_type = event.trigger_type OR trigger_type = 'both')
              AND is_active = TRUE
            ORDER BY priority DESC
        LOOP
            conditions_met := FALSE;
            BEGIN
                IF workflow.conditions IS NULL OR workflow.conditions = '{}'::jsonb THEN
                    conditions_met := TRUE;
                ELSIF workflow.condition_type = 'sql' THEN
                    conditions_met := wff_utils_evaluate_sql_condition(workflow.conditions->>'sql', event.trigger_data);
                ELSE
                    IF workflow.conditions->>'fields' IS NOT NULL AND event.trigger_type = 'on_update' THEN
                        FOR change IN SELECT jsonb_array_elements(event.trigger_data->'changes') LOOP
                            FOR field_path IN SELECT jsonb_array_elements_text(workflow.conditions->'fields') LOOP
                                IF change->>'path' = field_path THEN conditions_met := TRUE; EXIT; END IF;
                            END LOOP;
                            IF conditions_met THEN EXIT; END IF;
                        END LOOP;
                    ELSE
                        conditions_met := TRUE;
                        FOR condition_key, condition_rule IN SELECT * FROM jsonb_each(workflow.conditions) LOOP
                            actual_value := wff_utils_find_jsonb_value(event.trigger_data, condition_key);
                            IF condition_rule ? '$eq' THEN
                                expected_value := condition_rule -> '$eq';
                                IF actual_value IS DISTINCT FROM expected_value THEN conditions_met := FALSE; EXIT; END IF;
                            ELSE conditions_met := FALSE; EXIT; END IF;
                        END LOOP;
                    END IF;
                END IF;
                IF conditions_met THEN
                    FOR action IN SELECT * FROM wf_actions WHERE workflow_id = workflow.id AND is_enabled = TRUE ORDER BY action_order LOOP
                        PERFORM wff_core_dispatch_action(action.id, event.trigger_data || jsonb_build_object('event_id', event.id, 'workflow_id', workflow.id, 'action_id', action.id));
                    END LOOP;
                    UPDATE wf_workflows SET last_executed_at = NOW() WHERE id = workflow.id;
                ELSE
                    INSERT INTO wf_logs (organization_id, workflow_id, event_id, trigger_data, conditions_checked, status, error_message, log_level)
                    VALUES (event.organization_id, workflow.id, event.id, event.trigger_data, workflow.conditions, 'skipped', 'Condition not met', 'info');
                END IF;
            EXCEPTION
                WHEN OTHERS THEN
                    DECLARE
                        v_error_message TEXT;
                        v_error_context TEXT;
                    BEGIN
                        GET STACKED DIAGNOSTICS
                            v_error_message = MESSAGE_TEXT,
                            v_error_context = PG_EXCEPTION_CONTEXT;
                        workflow_execution_error := format('Message: %s || Context: %s', v_error_message, v_error_context);
                    END;
                    INSERT INTO wf_logs (organization_id, workflow_id, event_id, trigger_data, status, error_message, context, log_level)
                    VALUES (event.organization_id, workflow.id, event.id, event.trigger_data, 'failed', workflow_execution_error, jsonb_build_object('error_source', 'wff_core_process_event_queue_loop'), 'error');
            END;
        END LOOP;
        IF workflow_execution_error IS NOT NULL THEN
            UPDATE wf_events SET status = 'failed', error_message = COALESCE(event.error_message, '') || ' | ' || workflow_execution_error, retry_count = event.retry_count + 1, processed_at = NOW() WHERE id = event.id;
        ELSE
            UPDATE wf_events SET status = 'processed', processed_at = NOW() WHERE id = event.id;
        END IF;
        event_processing_duration := EXTRACT(EPOCH FROM (clock_timestamp() - event_processing_start_time)) * 1000;
        INSERT INTO wf_logs (organization_id, event_id, trigger_data, status, duration_ms, log_level)
        VALUES (event.organization_id, event.id, event.trigger_data, CASE WHEN workflow_execution_error IS NOT NULL THEN 'failed' ELSE 'success' END, event_processing_duration, CASE WHEN workflow_execution_error IS NOT NULL THEN 'error' ELSE 'info' END);
    END LOOP;
END;$_$;

CREATE FUNCTION catalog.x_zzz_wff_smart_send_email1(p_action_config jsonb, p_trigger_data jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$DECLARE
    v_action_config JSONB := p_action_config;
    v_trigger_data JSONB := p_trigger_data;
    v_combined_data JSONB; -- Will be populated by the flatten_jsonb function
    v_template_name TEXT := v_action_config->>'template_id';
    v_template_details JSONB;
    v_final_subject TEXT;
    v_final_body TEXT;
    v_to_config JSONB := v_action_config->'to';
    v_all_recipients TEXT[];
    v_placeholder RECORD;
    v_placeholder_path TEXT;
    v_resolved_value TEXT;
    v_response RECORD;
    v_supabase_anon_key TEXT;
    v_send_email_url TEXT;
    v_from_email TEXT;
BEGIN
    v_combined_data := wff_utils_flatten_jsonb(v_trigger_data || COALESCE(v_action_config->'data', '{}'::jsonb));
    SELECT secret INTO v_supabase_anon_key FROM vault.secrets WHERE name = 'supabase_anon_key';
    SELECT value INTO v_send_email_url FROM public.app_config WHERE name = 'SEND_EMAIL_FUNCTION_URL';
    SELECT value INTO v_from_email FROM public.app_config WHERE name = 'RESEND_FROM_EMAIL';
    IF v_supabase_anon_key IS NULL OR v_send_email_url IS NULL OR v_from_email IS NULL THEN
        RAISE EXCEPTION 'Missing required secrets.';
    END IF;
    IF v_template_name IS NOT NULL THEN
        SELECT details INTO v_template_details FROM public.email_templates WHERE name = v_template_name AND is_active = TRUE;
    END IF;
    v_final_subject := COALESCE(v_action_config->>'subject', v_template_details->>'subject', 'No Subject');
    v_final_body := COALESCE(v_action_config->>'body', v_template_details->>'body', '');
    IF jsonb_typeof(v_to_config) = 'array' THEN
        v_all_recipients := ARRAY(SELECT jsonb_array_elements_text(v_to_config));
    ELSIF jsonb_typeof(v_to_config) = 'string' THEN
        v_placeholder_path := trim(both '{{}}' from v_to_config->>0);
        v_resolved_value := v_trigger_data #>> string_to_array(v_placeholder_path, '.');
        IF v_resolved_value IS NOT NULL THEN v_all_recipients := ARRAY[v_resolved_value]; END IF;
    END IF;
    IF v_all_recipients IS NULL OR array_length(v_all_recipients, 1) = 0 THEN
        RAISE WARNING 'No recipients resolved.';
        RETURN;
    END IF;
    FOR v_placeholder IN SELECT DISTINCT regexp_matches(v_final_subject || v_final_body, '{{([^{}]+)}}', 'g') AS placeholder_full LOOP
        v_placeholder_path := v_placeholder.placeholder_full[1];
        v_resolved_value := v_combined_data->>v_placeholder_path; -- Direct lookup on the flattened object
        IF v_resolved_value IS NOT NULL THEN
            v_final_subject := replace(v_final_subject, '{{' || v_placeholder_path || '}}', v_resolved_value);
            v_final_body := replace(v_final_body, '{{' || v_placeholder_path || '}}', v_resolved_value);
        END IF;
    END LOOP;
    SELECT * INTO v_response FROM http_post(
        v_send_email_url,
        jsonb_build_array(jsonb_build_object('from', COALESCE(v_action_config->>'from', v_from_email),'to', v_all_recipients,'subject', v_final_subject,'html', v_final_body))::text,
        jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_supabase_anon_key)::text
    );
    IF v_trigger_data ? 'event_id' THEN
        INSERT INTO workflow.wf_logs (organization_id, event_id, workflow_id, action_id, trigger_data, status, log_level, context, error_message)
        VALUES ((v_trigger_data->>'organization_id')::uuid, (v_trigger_data->>'event_id')::uuid, (v_trigger_data->>'workflow_id')::uuid, (v_trigger_data->>'action_id')::uuid, v_trigger_data,
            CASE WHEN v_response.status = 200 THEN 'success' ELSE 'failed' END, CASE WHEN v_response.status = 200 THEN 'info' ELSE 'error' END,
            jsonb_build_object('action_type', 'send_email', 'to', v_all_recipients, 'from', COALESCE(v_action_config->>'from', v_from_email), 'subject', v_final_subject, 'http_status', v_response.status, 'http_response_content', v_response.content),
            CASE WHEN v_response.status = 200 THEN NULL ELSE 'Email Edge Function returned a non-200 status.' END);
    END IF;
    IF v_response.status != 200 THEN
        RAISE EXCEPTION 'Failed to send email via Edge Function: HTTP % - %', v_response.status, v_response.content;
    END IF;
END;$$;

CREATE VIEW catalog.v_asset_categories AS
 SELECT t.id,
    t.parent_id,
    t.name,
    t.path,
    t.details__fields__name,
    (t.details #>> '{fields,type}'::text[]) AS details__fields__type,
    t.details__fields__label,
    ((t.details #>> '{fields,required}'::text[]))::boolean AS details__fields__required,
    (t.details #>> '{fields,description}'::text[]) AS details__fields__description,
    t.details,
    t.created_at,
    t.updated_at,
    t.organization_id,
    fk_organization.name AS organization,
    t.location_id,
    fk_location.name AS location,
    t.short_code,
    t.search_vector
   FROM ((catalog.asset_categories t
     LEFT JOIN identity.organizations fk_organization ON ((t.organization_id = fk_organization.id)))
     LEFT JOIN identity.locations fk_location ON ((t.location_id = fk_location.id)));

ALTER TABLE catalog.asset_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.bundle_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.discount_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.discounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.inventory_levels ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.offering_bundles ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.offering_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.offering_prices ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.offering_variants ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.offerings ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.price_lists ENABLE ROW LEVEL SECURITY;

ALTER TABLE catalog.product_qna ENABLE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.asset_categories FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.bundle_items FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.discount_rules FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.discounts FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.inventory_levels FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.offering_bundles FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.offering_categories FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.offering_prices FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.offering_variants FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.offerings FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.price_lists FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY catalog.product_qna FORCE ROW LEVEL SECURITY;

CREATE SCHEMA catalog;

CREATE UNIQUE INDEX categories_name_org_loc_parent_null ON catalog.asset_categories USING btree (name, organization_id, location_id) WHERE (parent_id IS NULL);
