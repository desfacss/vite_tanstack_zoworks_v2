CREATE TABLE commerce.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid,
    session_token text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    discount_codes text[],
    discount_applications jsonb,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    converted_to_order_id uuid,
    external_cart_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE commerce.fulfillments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    tracking_number text,
    carrier text,
    tracking_url text,
    location_id uuid,
    status text NOT NULL,
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone,
    items jsonb NOT NULL,
    digital_assets jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE commerce.oauth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_user_id text,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    revoked_at timestamp with time zone
);

CREATE TABLE commerce.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    offering_id uuid NOT NULL,
    variant_id uuid,
    sku text,
    gtin text,
    name text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    price numeric(15,2) NOT NULL,
    total_discount numeric(15,2) DEFAULT 0,
    is_physical boolean DEFAULT true,
    is_digital boolean DEFAULT false,
    fulfilled_quantity numeric(10,2) DEFAULT 0,
    tax_lines jsonb,
    properties jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE commerce.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    customer_id uuid,
    email text NOT NULL,
    phone text,
    order_number text NOT NULL,
    checkout_token text,
    subtotal_price numeric(15,2) NOT NULL,
    total_discounts numeric(15,2) DEFAULT 0,
    total_tax numeric(15,2) DEFAULT 0,
    total_shipping numeric(15,2) DEFAULT 0,
    total_price numeric(15,2) NOT NULL,
    currency text DEFAULT 'INR'::text,
    status text DEFAULT 'pending'::text,
    payment_status text,
    fulfillment_status text,
    shipping_address jsonb,
    billing_address jsonb,
    shipping_lines jsonb,
    external_identifiers jsonb DEFAULT '{}'::jsonb,
    notes text,
    referrer text,
    browser_ip inet,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancelled_reason text
);

CREATE TABLE commerce.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    gateway text NOT NULL,
    gateway_order_id text,
    gateway_payment_id text,
    gateway_signature text,
    amount numeric(15,2) NOT NULL,
    currency text DEFAULT 'INR'::text,
    status text NOT NULL,
    type text NOT NULL,
    razorpay_method text,
    razorpay_bank_ref text,
    razorpay_error text,
    acp_delegated_token text,
    metadata jsonb,
    processed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    delegated_payment_token text,
    token_expires_at timestamp with time zone
);

CREATE TABLE commerce.returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    return_number text NOT NULL,
    reason text,
    status text NOT NULL,
    items jsonb NOT NULL,
    refund_amount numeric(15,2),
    refund_payment_id uuid,
    return_tracking_number text,
    return_carrier text,
    notes text,
    requested_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    received_at timestamp with time zone,
    refunded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE commerce.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    offering_id uuid NOT NULL,
    order_id uuid,
    customer_id uuid,
    rating integer NOT NULL,
    title text,
    content text,
    is_verified_purchase boolean DEFAULT false,
    status text DEFAULT 'pending'::text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE TABLE commerce.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    source text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    processed_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY commerce.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.fulfillments
    ADD CONSTRAINT fulfillments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.oauth_sessions
    ADD CONSTRAINT oauth_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.returns
    ADD CONSTRAINT returns_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.carts
    ADD CONSTRAINT carts_converted_to_order_id_fkey FOREIGN KEY (converted_to_order_id) REFERENCES commerce.orders(id);

ALTER TABLE ONLY commerce.carts
    ADD CONSTRAINT carts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES crm.contacts(id);

ALTER TABLE ONLY commerce.carts
    ADD CONSTRAINT carts_session_token_key UNIQUE (session_token);

ALTER TABLE ONLY commerce.fulfillments
    ADD CONSTRAINT fulfillments_location_id_fkey FOREIGN KEY (location_id) REFERENCES identity.locations(id);

ALTER TABLE ONLY commerce.fulfillments
    ADD CONSTRAINT fulfillments_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce.orders(id);

ALTER TABLE ONLY commerce.oauth_sessions
    ADD CONSTRAINT oauth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES identity.users(id);

ALTER TABLE ONLY commerce.order_items
    ADD CONSTRAINT order_items_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES catalog.offerings(id);

ALTER TABLE ONLY commerce.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce.orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY commerce.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES catalog.offering_variants(id);

ALTER TABLE ONLY commerce.orders
    ADD CONSTRAINT orders_checkout_token_key UNIQUE (checkout_token);

ALTER TABLE ONLY commerce.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES crm.contacts(id);

ALTER TABLE ONLY commerce.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);

ALTER TABLE ONLY commerce.orders
    ADD CONSTRAINT orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES identity.organizations(id);

ALTER TABLE ONLY commerce.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce.orders(id);

ALTER TABLE ONLY commerce.returns
    ADD CONSTRAINT returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce.orders(id);

ALTER TABLE ONLY commerce.returns
    ADD CONSTRAINT returns_refund_payment_id_fkey FOREIGN KEY (refund_payment_id) REFERENCES commerce.payments(id);

ALTER TABLE ONLY commerce.returns
    ADD CONSTRAINT returns_return_number_key UNIQUE (return_number);

ALTER TABLE ONLY commerce.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES crm.contacts(id);

ALTER TABLE ONLY commerce.reviews
    ADD CONSTRAINT reviews_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES catalog.offerings(id);

ALTER TABLE ONLY commerce.reviews
    ADD CONSTRAINT reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce.orders(id);

CREATE INDEX idx_carts_session_token ON commerce.carts USING btree (session_token) WHERE (converted_to_order_id IS NULL);

CREATE INDEX idx_order_items_order_offering ON commerce.order_items USING btree (order_id, offering_id);

CREATE INDEX idx_orders_external_identifiers ON commerce.orders USING gin (external_identifiers);

CREATE INDEX idx_payments_gateway_order ON commerce.payments USING btree (gateway_order_id) WHERE (gateway_order_id IS NOT NULL);

CREATE INDEX idx_webhook_events_created_at ON commerce.webhook_events USING btree (created_at);

CREATE INDEX idx_webhook_events_source_processed ON commerce.webhook_events USING btree (source, processed);

CREATE INDEX idx_webhook_events_unprocessed ON commerce.webhook_events USING btree (created_at) WHERE (processed = false);

CREATE TRIGGER trigger_create_invoice AFTER UPDATE OF payment_status ON commerce.orders FOR EACH ROW WHEN ((new.payment_status = 'paid'::text)) EXECUTE FUNCTION commerce.create_invoice();

CREATE TRIGGER trigger_deduct_inventory AFTER UPDATE OF payment_status ON commerce.orders FOR EACH ROW WHEN ((new.payment_status = 'paid'::text)) EXECUTE FUNCTION commerce.deduct_inventory();

CREATE TRIGGER trigger_order_notify AFTER UPDATE OF status, payment_status, fulfillment_status ON commerce.orders FOR EACH ROW EXECUTE FUNCTION commerce.notify_order_status();

CREATE FUNCTION commerce.create_invoice() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    invoice_id uuid;
    invoice_number text;
BEGIN
    invoice_number := 'INV-' || to_char(NEW.created_at, 'YYYY') || '-' || 
                      lpad(NEW.order_number::text, 5, '0');
    INSERT INTO finance.invoices (
        organization_id, contact_id, invoice_number, 
        total_amount, due_date, details, status
    ) VALUES (
        NEW.organization_id, 
        NEW.customer_id,
        invoice_number,
        NEW.total_price,
        NEW.created_at + interval '30 days', -- Net 30 terms
        (SELECT jsonb_agg(jsonb_build_object(
            'description', name,
            'quantity', quantity,
            'unit_price', price,
            'total', price * quantity
        )) FROM commerce.order_items WHERE order_id = NEW.id),
        'paid'
    );
    RETURN NEW;
END;
$$;

CREATE FUNCTION commerce.create_order_with_payment(p_cart_id uuid, p_email text, p_shipping_address jsonb, p_billing_address jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_order_id uuid;
    v_order_number text;
    v_cart_items jsonb;
    v_subtotal numeric := 0;
    v_total numeric := 0;
BEGIN
    SELECT items INTO v_cart_items
    FROM commerce.carts
    WHERE id = p_cart_id;
    v_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || 
                      lpad(floor(random() * 1000000)::text, 6, '0');
    SELECT COALESCE(SUM((item->>'quantity')::numeric * (item->>'price')::numeric), 0)
    INTO v_subtotal
    FROM jsonb_array_elements(v_cart_items) AS item;
    v_total := v_subtotal; -- Add tax, shipping later
    INSERT INTO commerce.orders (
        organization_id,
        customer_id,
        email,
        order_number,
        subtotal_price,
        total_price,
        shipping_address,
        billing_address,
        status,
        payment_status
    ) VALUES (
        identity.get_current_org_id(),
        auth.uid(),
        p_email,
        v_order_number,
        v_subtotal,
        v_total,
        p_shipping_address,
        COALESCE(p_billing_address, p_shipping_address),
        'pending',
        'pending'
    ) RETURNING id INTO v_order_id;
    INSERT INTO commerce.order_items (
        order_id,
        organization_id,
        offering_id,
        variant_id,
        sku,
        name,
        quantity,
        price,
        is_physical,
        properties
    )
    SELECT 
        v_order_id,
        identity.get_current_org_id(),
        (item->>'offering_id')::uuid,
        (item->>'variant_id')::uuid,
        (item->>'sku'),
        (item->>'name'),
        (item->>'quantity')::numeric,
        (item->>'price')::numeric,
        COALESCE((item->>'is_physical')::boolean, true),
        (item->'properties')
    FROM jsonb_array_elements(v_cart_items) AS item;
    DELETE FROM commerce.carts WHERE id = p_cart_id;
    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total,
        'payment_link', CONCAT('/api/payments/create?order_id=', v_order_id)
    );
END;
$$;

CREATE FUNCTION commerce.deduct_inventory() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE catalog.inventory_levels il
    SET quantity = quantity - oi.quantity,
        updated_at = now()
    FROM commerce.order_items oi
    WHERE oi.order_id = NEW.order_id
      AND oi.is_physical = true
      AND il.offering_variant_id = oi.variant_id;
    RETURN NEW;
END;
$$;

CREATE FUNCTION commerce.get_acp_product_feed(p_limit integer DEFAULT 1000, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'gtin', o.gtin,
        'name', o.name,
        'description', o.short_description,
        'brand', o.brand,
        'price', (
            SELECT jsonb_build_object(
                'amount', p.amount,
                'currency', 'INR',
                'min_quantity', p.min_quantity,
                'max_quantity', p.max_quantity
            )
            FROM catalog.offering_prices p
            WHERE p.offering_id = o.id 
              AND p.valid_from <= now()
              AND (p.valid_to IS NULL OR p.valid_to >= now())
            ORDER BY p.amount ASC LIMIT 1
        ),
        'variants', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', ov.id,
                'sku', ov.sku,
                'attributes', ov.attributes,
                'inventory', (
                    SELECT COALESCE(SUM(quantity), 0) 
                    FROM catalog.inventory_levels il 
                    WHERE il.offering_variant_id = ov.id
                ),
                'price_override', ov.price_override
            ))
            FROM catalog.offering_variants ov
            WHERE ov.offering_id = o.id AND ov.is_active = true
        ),
        'images', o.meta->'images',
        'return_rate', o.return_rate,
        'enable_checkout', o.enable_checkout,
        'q_and_a', (
            SELECT jsonb_agg(jsonb_build_object(
                'question', qa.question,
                'answer', qa.answer,
                'is_automated', qa.is_automated
            ))
            FROM catalog.product_qna qa
            WHERE qa.offering_id = o.id
        ),
        'certifications', o.certifications,
        'shipping_weight', jsonb_build_object('value', o.weight, 'unit', o.weight_unit)
    ))
    INTO result
    FROM catalog.offerings o
    WHERE o.is_active = true 
      AND o.enable_checkout = true
    LIMIT p_limit OFFSET p_offset;
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE FUNCTION commerce.notify_order_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM pg_notify(
        'order_status_channel',
        json_build_object(
            'order_id', NEW.id,
            'order_number', NEW.order_number,
            'status', NEW.status,
            'payment_status', NEW.payment_status,
            'fulfillment_status', NEW.fulfillment_status
        )::text
    );
    RETURN NEW;
END;
$$;

CREATE FUNCTION commerce.ondc_search(p_category_id uuid DEFAULT NULL::uuid, p_search_text text DEFAULT NULL::text, p_min_price numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric, p_limit integer DEFAULT 50) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'descriptor', jsonb_build_object(
            'name', o.name,
            'short_desc', o.short_description,
            'long_desc', o.description,
            'images', o.meta->'images'
        ),
        'price', jsonb_build_object(
            'value', p.amount,
            'currency', 'INR'
        ),
        'quantity', jsonb_build_object(
            'available', COALESCE((
                SELECT SUM(il.quantity) 
                FROM catalog.inventory_levels il
                JOIN catalog.offering_variants ov ON ov.id = il.offering_variant_id
                WHERE ov.offering_id = o.id
            ), 0)
        ),
        'tags', jsonb_build_object(
            'gtin', o.gtin,
            'brand', o.brand,
            'hs_code', o.hs_code
        )
    ))
    INTO result
    FROM catalog.offerings o
    CROSS JOIN LATERAL (
        SELECT amount FROM catalog.offering_prices 
        WHERE offering_id = o.id 
        ORDER BY amount ASC LIMIT 1
    ) p
    WHERE o.is_active = true
      AND o.enable_checkout = true
      AND (p_category_id IS NULL OR o.category_id = p_category_id)
      AND (p_search_text IS NULL OR o.name ILIKE '%' || p_search_text || '%')
      AND (p_min_price IS NULL OR p.amount >= p_min_price)
      AND (p_max_price IS NULL OR p.amount <= p_max_price)
    LIMIT p_limit;
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE FUNCTION commerce.ucp_product_feed_json() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_agg(jsonb_build_object(
        'id', product_id,
        'title', title,
        'description', description,
        'link', CONCAT('https://yourstore.com/products/', product_id),
        'image_link', images,
        'availability', CASE WHEN in_stock THEN 'in stock' ELSE 'out of stock' END,
        'price', CONCAT(price, ' INR'),
        'brand', brand,
        'gtin', gtin,
        'mpn', mpn,
        'condition', 'new',
        'shipping_weight', CONCAT(weight, ' ', weight_unit),
        'tax', jsonb_build_object('rate', 18, 'country', 'IN')
    ))
    INTO result
    FROM commerce.ucp_product_feed;
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE VIEW commerce.acp_purchases AS
 SELECT o.id,
    o.order_number,
    ((o.external_identifiers -> 'acp'::text) ->> 'conversation_id'::text) AS acp_conversation_id,
    p.delegated_payment_token,
    p.gateway_payment_id,
    o.total_price,
    o.created_at
   FROM (commerce.orders o
     JOIN commerce.payments p ON ((p.order_id = o.id)))
  WHERE (o.external_identifiers ? 'acp'::text);

CREATE VIEW commerce.ondc_transactions AS
 SELECT o.id,
    o.order_number,
    ((o.external_identifiers -> 'ondc'::text) ->> 'transaction_id'::text) AS ondc_txn_id,
    ((o.external_identifiers -> 'ondc'::text) ->> 'provider_id'::text) AS ondc_provider_id,
    o.status,
    o.created_at,
    p.gateway_payment_id,
    f.tracking_number AS fulfillment_tracking
   FROM ((commerce.orders o
     LEFT JOIN commerce.payments p ON ((p.order_id = o.id)))
     LEFT JOIN commerce.fulfillments f ON ((f.order_id = o.id)))
  WHERE (o.external_identifiers ? 'ondc'::text);

CREATE VIEW commerce.ucp_orders AS
 SELECT id,
    order_number,
    ((external_identifiers -> 'ucp'::text) ->> 'session_id'::text) AS ucp_session_id,
    ((external_identifiers -> 'ucp'::text) ->> 'checkout_id'::text) AS ucp_checkout_id,
    email,
    total_price,
    status,
    created_at
   FROM commerce.orders o
  WHERE (external_identifiers ? 'ucp'::text);

CREATE VIEW commerce.ucp_product_feed AS
 SELECT o.id AS product_id,
    o.gtin,
    o.mpn,
    o.brand,
    o.name AS title,
    o.short_description AS description,
    o.is_physical,
    o.weight,
    o.weight_unit,
    o.dimensions,
    ( SELECT offering_prices.amount
           FROM catalog.offering_prices
          WHERE ((offering_prices.offering_id = o.id) AND (offering_prices.valid_from <= now()) AND ((offering_prices.valid_to IS NULL) OR (offering_prices.valid_to >= now())))
          ORDER BY offering_prices.amount
         LIMIT 1) AS price,
    o.country_of_origin,
    o.hs_code,
    o.return_rate,
    o.popularity_score,
    (EXISTS ( SELECT 1
           FROM (catalog.inventory_levels il
             JOIN catalog.offering_variants ov ON ((ov.id = il.offering_variant_id)))
          WHERE ((ov.offering_id = o.id) AND (il.quantity > 0)))) AS in_stock,
    (o.meta ->> 'images'::text) AS images,
    oc.name AS category_name,
    oc.path AS category_path
   FROM (catalog.offerings o
     LEFT JOIN catalog.offering_categories oc ON ((o.category_id = oc.id)))
  WHERE ((o.is_active = true) AND (o.enable_checkout = true));

ALTER TABLE commerce.carts ENABLE ROW LEVEL SECURITY;

ALTER TABLE commerce.fulfillments ENABLE ROW LEVEL SECURITY;

ALTER TABLE commerce.oauth_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE commerce.order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE commerce.orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE commerce.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE commerce.returns ENABLE ROW LEVEL SECURITY;

ALTER TABLE commerce.reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE commerce.webhook_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE ONLY commerce.carts FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY commerce.fulfillments FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY commerce.oauth_sessions FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY commerce.order_items FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY commerce.orders FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY commerce.payments FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY commerce.returns FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY commerce.reviews FORCE ROW LEVEL SECURITY;

ALTER TABLE ONLY commerce.webhook_events FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN commerce.orders.external_identifiers IS '{
    "ondc": {"transaction_id": "...", "provider_id": "...", "network_id": "..."},
    "ucp": {"session_id": "...", "checkout_id": "...", "merchant_id": "..."},
    "acp": {"conversation_id": "...", "agent_session": "..."}
}';

CREATE SCHEMA commerce;
