export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          line1: string
          phone: string
          state: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          line1: string
          phone: string
          state: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          line1?: string
          phone?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feature_access: {
        Row: {
          blocked: boolean
          feature: string
          reason: string
          status: number
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          feature: string
          reason?: string
          status?: number
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          feature?: string
          reason?: string
          status?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          body: string
          category: string
          cover_url: string
          created_at: string
          excerpt: string
          id: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          body?: string
          category?: string
          cover_url?: string
          created_at?: string
          excerpt?: string
          id?: string
          slug: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          cover_url?: string
          created_at?: string
          excerpt?: string
          id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          qty: number
          updated_at: string
          user_id: string
          variant_id: string
        }
        Insert: {
          qty: number
          updated_at?: string
          user_id: string
          variant_id: string
        }
        Update: {
          qty?: number
          updated_at?: string
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          description: string
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          description?: string
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          description?: string
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      collections: {
        Row: {
          description: string
          id: string
          name: string
          product_ids: string[]
          published: boolean
          slug: string
          sort: number
        }
        Insert: {
          description?: string
          id?: string
          name: string
          product_ids?: string[]
          published?: boolean
          slug: string
          sort?: number
        }
        Update: {
          description?: string
          id?: string
          name?: string
          product_ids?: string[]
          published?: boolean
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          min_spend: number
          type: string
          usage_count: number
          usage_limit: number | null
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          min_spend?: number
          type: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          min_spend?: number
          type?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      hero_carousels: {
        Row: {
          autoplay: boolean
          enabled: boolean
          id: string
          interval_ms: number
          product_count: number
          product_ids: string[]
          promo_count: number
          promo_ids: string[]
          updated_at: string
        }
        Insert: {
          autoplay?: boolean
          enabled?: boolean
          id: string
          interval_ms?: number
          product_count?: number
          product_ids?: string[]
          promo_count?: number
          promo_ids?: string[]
          updated_at?: string
        }
        Update: {
          autoplay?: boolean
          enabled?: boolean
          id?: string
          interval_ms?: number
          product_count?: number
          product_ids?: string[]
          promo_count?: number
          promo_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      hero_promotions: {
        Row: {
          body: string
          created_at: string
          cta_href: string
          cta_label: string
          eyebrow: string
          id: string
          image_url: string
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          cta_href?: string
          cta_label?: string
          eyebrow?: string
          id?: string
          image_url?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          cta_href?: string
          cta_label?: string
          eyebrow?: string
          id?: string
          image_url?: string
          title?: string
        }
        Relationships: []
      }
      newsletter_signups: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          event: string
          id: string
          order_id: string | null
          payload: Json
          recipient: string
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          event: string
          id?: string
          order_id?: string | null
          payload?: Json
          recipient: string
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          event?: string
          id?: string
          order_id?: string | null
          payload?: Json
          recipient?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          image_url: string
          order_id: string
          product_name: string
          product_slug: string
          qty: number
          sku: string
          supplier_id: string | null
          unit_price: number
          variant_id: string | null
          variant_name: string
        }
        Insert: {
          id?: string
          image_url?: string
          order_id: string
          product_name: string
          product_slug: string
          qty: number
          sku: string
          supplier_id?: string | null
          unit_price: number
          variant_id?: string | null
          variant_name: string
        }
        Update: {
          id?: string
          image_url?: string
          order_id?: string
          product_name?: string
          product_slug?: string
          qty?: number
          sku?: string
          supplier_id?: string | null
          unit_price?: number
          variant_id?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor: string
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          actor?: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          actor?: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_token: string
          coupon_code: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          discount: number
          email: string
          id: string
          notes: string | null
          order_number: string
          paid_at: string | null
          phone: string
          shipping_address: Json
          shipping_fee: number
          shipping_zone: string
          staff_notes: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          user_id: string | null
        }
        Insert: {
          access_token?: string
          coupon_code?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          discount?: number
          email: string
          id?: string
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          phone: string
          shipping_address: Json
          shipping_fee: number
          shipping_zone: string
          staff_notes?: string | null
          status?: string
          subtotal: number
          tax?: number
          total: number
          user_id?: string | null
        }
        Update: {
          access_token?: string
          coupon_code?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          discount?: number
          email?: string
          id?: string
          notes?: string | null
          order_number?: string
          paid_at?: string | null
          phone?: string
          shipping_address?: Json
          shipping_fee?: number
          shipping_zone?: string
          staff_notes?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          provider: string
          raw_payload: Json | null
          reference: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          provider?: string
          raw_payload?: Json | null
          reference: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          provider?: string
          raw_payload?: Json | null
          reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          cost_price: number | null
          id: string
          lead_time_days: number | null
          low_stock_threshold: number
          name: string
          option_color: string | null
          option_size: string | null
          price: number
          product_id: string
          qty_on_hand: number
          qty_reserved: number
          sku: string
          sort: number
          supplier_id: string | null
          supplier_sku: string | null
        }
        Insert: {
          compare_at_price?: number | null
          cost_price?: number | null
          id?: string
          lead_time_days?: number | null
          low_stock_threshold?: number
          name?: string
          option_color?: string | null
          option_size?: string | null
          price: number
          product_id: string
          qty_on_hand?: number
          qty_reserved?: number
          sku: string
          sort?: number
          supplier_id?: string | null
          supplier_sku?: string | null
        }
        Update: {
          compare_at_price?: number | null
          cost_price?: number | null
          id?: string
          lead_time_days?: number | null
          low_stock_threshold?: number
          name?: string
          option_color?: string | null
          option_size?: string | null
          price?: number
          product_id?: string
          qty_on_hand?: number
          qty_reserved?: number
          sku?: string
          sort?: number
          supplier_id?: string | null
          supplier_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          category_id: string | null
          created_at: string
          description: string
          featured: boolean
          gallery: string[]
          id: string
          image_refs: Json
          image_url: string
          name: string
          published: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          specs: Json
          tag_ids: string[]
          updated_at: string
        }
        Insert: {
          brand?: string
          category_id?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          gallery?: string[]
          id?: string
          image_refs?: Json
          image_url?: string
          name: string
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          specs?: Json
          tag_ids?: string[]
          updated_at?: string
        }
        Update: {
          brand?: string
          category_id?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          gallery?: string[]
          id?: string
          image_refs?: Json
          image_url?: string
          name?: string
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          specs?: Json
          tag_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          marketing_opt_in: boolean
          notify_sms: boolean
          phone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          marketing_opt_in?: boolean
          notify_sms?: boolean
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          marketing_opt_in?: boolean
          notify_sms?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          item_ids: string[]
          order_id: string
          photo_url: string | null
          reason: string
          restock: boolean
          status: string
          user_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          item_ids: string[]
          order_id: string
          photo_url?: string | null
          reason: string
          restock?: boolean
          status?: string
          user_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          item_ids?: string[]
          order_id?: string
          photo_url?: string | null
          reason?: string
          restock?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string
          created_at: string
          estimated_delivery: string | null
          id: string
          order_id: string
          status: string
          tracking_no: string
        }
        Insert: {
          carrier: string
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          order_id: string
          status?: string
          tracking_no: string
        }
        Update: {
          carrier?: string
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          order_id?: string
          status?: string
          tracking_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_cities: {
        Row: {
          active: boolean
          fee: number | null
          id: string
          name: string
          sort: number
          state_id: string
        }
        Insert: {
          active?: boolean
          fee?: number | null
          id?: string
          name: string
          sort?: number
          state_id: string
        }
        Update: {
          active?: boolean
          fee?: number | null
          id?: string
          name?: string
          sort?: number
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_cities_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "shipping_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_zones: {
        Row: {
          active: boolean
          eta_days: string
          fee: number
          id: string
          name: string
          sort: number
        }
        Insert: {
          active?: boolean
          eta_days?: string
          fee: number
          id?: string
          name: string
          sort?: number
        }
        Update: {
          active?: boolean
          eta_days?: string
          fee?: number
          id?: string
          name?: string
          sort?: number
        }
        Relationships: []
      }
      sourcing_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          request: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          request: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          request?: string
          status?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          actor: string | null
          created_at: string
          delta: number
          id: string
          reason: string
          variant_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          delta: number
          id?: string
          reason: string
          variant_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "storefront_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_state: {
        Row: {
          active_index: number
          created_at: string
          id: number
          updated_at: string
        }
        Insert: {
          active_index?: number
          created_at?: string
          id?: number
          updated_at?: string
        }
        Update: {
          active_index?: number
          created_at?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          currency: string
          free_shipping_threshold: number
          home_sections: Json
          id: number
          maintenance_message: string
          maintenance_mode: boolean
          product_card_style: string
          public_sections: Json
          return_window_days: number
          store_name: string
          support_email: string
          support_phone: string
          tax_rate_bp: number
          updated_at: string
        }
        Insert: {
          currency?: string
          free_shipping_threshold?: number
          home_sections?: Json
          id?: number
          maintenance_message?: string
          maintenance_mode?: boolean
          product_card_style?: string
          public_sections?: Json
          return_window_days?: number
          store_name?: string
          support_email?: string
          support_phone?: string
          tax_rate_bp?: number
          updated_at?: string
        }
        Update: {
          currency?: string
          free_shipping_threshold?: number
          home_sections?: Json
          id?: number
          maintenance_message?: string
          maintenance_mode?: boolean
          product_card_style?: string
          public_sections?: Json
          return_window_days?: number
          store_name?: string
          support_email?: string
          support_phone?: string
          tax_rate_bp?: number
          updated_at?: string
        }
        Relationships: []
      }
      supplier_order_items: {
        Row: {
          cost_price: number | null
          id: string
          order_item_id: string
          qty: number
          supplier_order_id: string
          supplier_sku: string | null
        }
        Insert: {
          cost_price?: number | null
          id?: string
          order_item_id: string
          qty: number
          supplier_order_id: string
          supplier_sku?: string | null
        }
        Update: {
          cost_price?: number | null
          id?: string
          order_item_id?: string
          qty?: number
          supplier_order_id?: string
          supplier_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_order_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_items_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          id: string
          order_id: string
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          order_id: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          id?: string
          order_id?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          api_config: Json
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          integration_type: string
          lead_time_days: number
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          api_config?: Json
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          integration_type?: string
          lead_time_days?: number
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          api_config?: Json
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          integration_type?: string
          lead_time_days?: number
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      storefront_variants: {
        Row: {
          compare_at_price: number | null
          id: string | null
          low_stock_threshold: number | null
          name: string | null
          option_color: string | null
          option_size: string | null
          price: number | null
          product_id: string | null
          qty_available: number | null
          sku: string | null
          sort: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _order_transition: {
        Args: { _actor: string; _note: string; _order: string; _to: string }
        Returns: undefined
      }
      adjust_stock: {
        Args: { _delta: number; _reason: string; _variant: string }
        Returns: undefined
      }
      admin_dashboard: { Args: never; Returns: Json }
      confirm_payment: {
        Args: {
          _amount: number
          _currency: string
          _payload: Json
          _reference: string
          _success: boolean
        }
        Returns: string
      }
      customer_cancel_order: { Args: { _order: string }; Returns: undefined }
      deliver_order: { Args: { _order: string }; Returns: undefined }
      delivery_city_fee: {
        Args: { _city: string; _state: string }
        Returns: number
      }
      expire_stale_orders: { Args: never; Returns: number }
      export_schema_sql: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_store_owner: { Args: { _user_id: string }; Returns: boolean }
      place_order: {
        Args: {
          _address: Json
          _coupon: string
          _email: string
          _items: Json
          _notes: string
          _phone: string
          _user: string
          _zone: string
        }
        Returns: Json
      }
      process_return: {
        Args: { _action: string; _restock?: boolean; _return: string }
        Returns: undefined
      }
      quote_cart: {
        Args: { _coupon: string; _items: Json; _zone: string }
        Returns: Json
      }
      quote_cart_city: {
        Args: { _city: string; _coupon: string; _items: Json; _zone: string }
        Returns: Json
      }
      request_return: {
        Args: {
          _comments: string
          _items: string[]
          _order: string
          _photo: string
          _reason: string
        }
        Returns: string
      }
      save_catalog_group: {
        Args: {
          _description: string
          _id: string
          _kind: string
          _name: string
          _products: string[]
          _published?: boolean
          _slug: string
          _sort: number
        }
        Returns: string
      }
      ship_order: {
        Args: {
          _carrier: string
          _eta?: string
          _order: string
          _tracking: string
        }
        Returns: undefined
      }
      transition_order: {
        Args: { _note?: string; _order: string; _to: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
