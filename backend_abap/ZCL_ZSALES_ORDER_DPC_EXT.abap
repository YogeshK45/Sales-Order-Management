*======================================================================*
* CLASS ZCL_ZSALES_ORDER_DPC_EXT DEFINITION                            *
* Sales Order Management Gateway Service Implementation (OData V2)     *
* Traditional ABAP Backend (SE11 Tables: ZSO_HDR & ZSO_ITEM)           *
*======================================================================*

CLASS zcl_zsales_order_dpc_ext DEFINITION
  PUBLIC
  INHERITING FROM zcl_zsales_order_dpc
  CREATE PUBLIC .

  PUBLIC SECTION.
    METHODS:
      /iwbep/if_mgw_appl_srv_runtime~create_deep_entity REDEFINITION.

  PROTECTED SECTION.
    METHODS:
      salesorderheader_get_entityset REDEFINITION,
      salesorderheader_get_entity    REDEFINITION,
      salesorderheader_create_entity REDEFINITION,
      salesorderheader_update_entity REDEFINITION,
      salesorderheader_delete_entity REDEFINITION,
      salesorderitem_get_entityset   REDEFINITION,
      customer_get_entityset         REDEFINITION,
      material_get_entityset         REDEFINITION.

  PRIVATE SECTION.
    TYPES:
      BEGIN OF ty_deep_item,
        vbeln      TYPE zso_item-vbeln,
        posnr      TYPE zso_item-posnr,
        matnr      TYPE zso_item-matnr,
        maktx      TYPE char40,
        qty        TYPE zso_item-kwmeng,
        meins      TYPE zso_item-vrkme,
        unit_price TYPE zso_item-netpr,
        net_amount TYPE zso_item-netwr,
        waers      TYPE zso_item-waerk,
      END OF ty_deep_item,
      tt_deep_items TYPE STANDARD TABLE OF ty_deep_item WITH DEFAULT KEY,

      BEGIN OF ty_deep_sales_order,
        vbeln         TYPE zso_hdr-vbeln,
        kunnr         TYPE zso_hdr-kunnr,
        customer_name TYPE char35,
        erdat         TYPE zso_hdr-erdat,
        status        TYPE zso_hdr-status,
        status_text   TYPE char20,
        currency      TYPE zso_hdr-waerk,
        total_amount  TYPE zso_hdr-netwr,
        item_count    TYPE i,
        remarks       TYPE zso_hdr-remarks,
        to_items      TYPE tt_deep_items,
      END OF ty_deep_sales_order.

    METHODS:
      get_next_order_number
        EXPORTING
          ev_vbeln TYPE zso_hdr-vbeln
        RAISING
          /iwbep/cx_mgw_busi_exception.

ENDCLASS.



CLASS zcl_zsales_order_dpc_ext IMPLEMENTATION.

*----------------------------------------------------------------------*
* METHOD salesorderheader_get_entityset                                *
* Query Sales Orders from ZSO_HDR with Filtering, Sorting & Paging     *
*----------------------------------------------------------------------*
  METHOD salesorderheader_get_entityset.
    DATA: lt_hdr         TYPE STANDARD TABLE OF zso_hdr,
          ls_hdr         TYPE zso_hdr,
          ls_entity      LIKE LINE OF et_entityset,
          lt_filter_so   TYPE /iwbep/t_mgw_select_option,
          ls_filter_so   TYPE /iwbep/s_mgw_select_option,
          lr_status      TYPE RANGE OF zso_hdr-status,
          lrs_status     LIKE LINE OF lr_status,
          lr_kunnr       TYPE RANGE OF zso_hdr-kunnr,
          lrs_kunnr      LIKE LINE OF lr_kunnr,
          lv_top         TYPE i,
          lv_skip        TYPE i,
          lv_customer    TYPE char35,
          lv_count       TYPE i.

    " 1. Extract Filter Select Options from Request Context
    IF io_tech_request_context IS BOUND.
      lt_filter_so = io_tech_request_context->get_filter( )->get_filter_select_options( ).

      " Filter by STATUS ('O', 'C', 'X')
      READ TABLE lt_filter_so INTO ls_filter_so WITH KEY property = 'STATUS'.
      IF sy-subrc = 0.
        LOOP AT ls_filter_so-select_options INTO DATA(ls_so_stat).
          lrs_status-sign   = ls_so_stat-sign.
          lrs_status-option = ls_so_stat-option.
          lrs_status-low    = ls_so_stat-low.
          lrs_status-high   = ls_so_stat-high.
          APPEND lrs_status TO lr_status.
        ENDLOOP.
      ENDIF.

      " Filter by KUNNR
      READ TABLE lt_filter_so INTO ls_filter_so WITH KEY property = 'KUNNR'.
      IF sy-subrc = 0.
        LOOP AT ls_filter_so-select_options INTO DATA(ls_so_kunnr).
          lrs_kunnr-sign   = ls_so_kunnr-sign.
          lrs_kunnr-option = ls_so_kunnr-option.
          lrs_kunnr-low    = ls_so_kunnr-low.
          lrs_kunnr-high   = ls_so_kunnr-high.
          APPEND lrs_kunnr TO lr_kunnr.
        ENDLOOP.
      ENDIF.

      " Paging ($top, $skip)
      lv_top  = io_tech_request_context->get_top( ).
      lv_skip = io_tech_request_context->get_skip( ).
    ENDIF.

    " 2. Fetch Header Records from custom table ZSO_HDR using Open SQL
    SELECT mandt, vbeln, kunnr, erdat, status, waerk, netwr, remarks
      FROM zso_hdr
      WHERE status IN @lr_status
        AND kunnr  IN @lr_kunnr
      ORDER BY vbeln DESCENDING
      INTO CORRESPONDING FIELDS OF TABLE @lt_hdr.

    " 3. Map to Gateway EntitySet and enrich with Customer Names & Item Counts
    LOOP AT lt_hdr INTO ls_hdr.
      CLEAR: ls_entity, lv_customer, lv_count.

      MOVE-CORRESPONDING ls_hdr TO ls_entity.
      ls_entity-currency     = ls_hdr-waerk.
      ls_entity-total_amount = ls_hdr-netwr.

      " Fetch customer name from KNA1 master table
      SELECT SINGLE name1 FROM kna1 INTO @lv_customer WHERE kunnr = @ls_hdr-kunnr.
      IF sy-subrc = 0.
        ls_entity-customer_name = lv_customer.
      ELSE.
        ls_entity-customer_name = |Customer { ls_hdr-kunnr }|.
      ENDIF.

      " Calculate status text
      CASE ls_hdr-status.
        WHEN 'O'.
          ls_entity-status_text = 'Open'.
        WHEN 'C'.
          ls_entity-status_text = 'Confirmed'.
        WHEN 'X'.
          ls_entity-status_text = 'Cancelled'.
        WHEN OTHERS.
          ls_entity-status_text = ls_hdr-status.
      ENDCASE.

      " Calculate count of line items from ZSO_ITEM
      SELECT COUNT( * ) FROM zso_item INTO @lv_count WHERE vbeln = @ls_hdr-vbeln.
      ls_entity-item_count = lv_count.

      APPEND ls_entity TO et_entityset.
    ENDLOOP.

    " Apply $skip and $top pagination in ABAP if requested
    IF lv_skip > 0 AND lines( et_entityset ) >= lv_skip.
      DELETE et_entityset TO lv_skip.
    ENDIF.
    IF lv_top > 0 AND lines( et_entityset ) > lv_top.
      DELETE et_entityset FROM ( lv_top + 1 ).
    ENDIF.

  ENDMETHOD.


*----------------------------------------------------------------------*
* METHOD salesorderheader_get_entity                                   *
* Read single Sales Order Header by VBELN                              *
*----------------------------------------------------------------------*
  METHOD salesorderheader_get_entity.
    DATA: ls_hdr   TYPE zso_hdr,
          lv_vbeln TYPE zso_hdr-vbeln,
          lv_count TYPE i.

    " Extract Key VBELN from it_key_tab
    READ TABLE it_key_tab INTO DATA(ls_key) WITH KEY name = 'VBELN'.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid = /iwbep/cx_mgw_busi_exception=>business_error
          message = 'Sales Order ID key parameter is missing.'.
    ENDIF.

    lv_vbeln = |{ ls_key-value ALPHA = IN }|.

    " Read record from ZSO_HDR
    SELECT SINGLE * FROM zso_hdr INTO @ls_hdr WHERE vbeln = @lv_vbeln.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid = /iwbep/cx_mgw_busi_exception=>resource_not_found
          message = |Sales Order { lv_vbeln } not found in table ZSO_HDR.|.
    ENDIF.

    MOVE-CORRESPONDING ls_hdr TO er_entity.
    er_entity-currency     = ls_hdr-waerk.
    er_entity-total_amount = ls_hdr-netwr.

    " Fetch customer name
    SELECT SINGLE name1 FROM kna1 INTO @er_entity-customer_name WHERE kunnr = @ls_hdr-kunnr.

    " Map Status text
    CASE ls_hdr-status.
      WHEN 'O'. er_entity-status_text = 'Open'.
      WHEN 'C'. er_entity-status_text = 'Confirmed'.
      WHEN 'X'. er_entity-status_text = 'Cancelled'.
    ENDCASE.

    " Item Count
    SELECT COUNT( * ) FROM zso_item INTO @lv_count WHERE vbeln = @lv_vbeln.
    er_entity-item_count = lv_count.

  ENDMETHOD.


*----------------------------------------------------------------------*
* METHOD salesorderheader_update_entity                                *
* Update Sales Order Status / Remarks in ZSO_HDR                       *
*----------------------------------------------------------------------*
  METHOD salesorderheader_update_entity.
    DATA: ls_entry TYPE zcl_zsales_order_mpc=>ts_salesorderheader,
          lv_vbeln TYPE zso_hdr-vbeln.

    " Extract Key
    READ TABLE it_key_tab INTO DATA(ls_key) WITH KEY name = 'VBELN'.
    lv_vbeln = |{ ls_key-value ALPHA = IN }|.

    " Read update payload from frontend
    io_data_provider->read_entry_data( IMPORTING es_data = ls_entry ).

    " Update custom table ZSO_HDR
    UPDATE zso_hdr
      SET status  = @ls_entry-status,
          remarks = @ls_entry-remarks,
          aedat   = @sy-datum,
          aenam   = @sy-uname
      WHERE vbeln = @lv_vbeln.

    IF sy-subrc = 0.
      COMMIT WORK AND WAIT.
      er_entity = ls_entry.
      er_entity-vbeln = lv_vbeln.
    ELSE.
      ROLLBACK WORK.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid = /iwbep/cx_mgw_busi_exception=>business_error
          message = |Failed to update Sales Order { lv_vbeln } in ZSO_HDR.|.
    ENDIF.

  ENDMETHOD.


*----------------------------------------------------------------------*
* METHOD salesorderheader_delete_entity                                *
* Transactional Delete: Removes items from ZSO_ITEM then ZSO_HDR       *
*----------------------------------------------------------------------*
  METHOD salesorderheader_delete_entity.
    DATA: lv_vbeln TYPE zso_hdr-vbeln.

    READ TABLE it_key_tab INTO DATA(ls_key) WITH KEY name = 'VBELN'.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid = /iwbep/cx_mgw_busi_exception=>business_error
          message = 'Sales Order key missing for delete.'.
    ENDIF.

    lv_vbeln = |{ ls_key-value ALPHA = IN }|.

    " Check order existence
    SELECT SINGLE vbeln FROM zso_hdr INTO @lv_vbeln WHERE vbeln = @lv_vbeln.
    IF sy-subrc <> 0.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid = /iwbep/cx_mgw_busi_exception=>resource_not_found
          message = |Sales Order { lv_vbeln } not found.|.
    ENDIF.

    " Transactional delete
    DELETE FROM zso_item WHERE vbeln = @lv_vbeln.
    DELETE FROM zso_hdr  WHERE vbeln = @lv_vbeln.

    IF sy-subrc = 0.
      COMMIT WORK AND WAIT.
    ELSE.
      ROLLBACK WORK.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid = /iwbep/cx_mgw_busi_exception=>business_error
          message = |Error deleting Sales Order { lv_vbeln } from database.|.
    ENDIF.

  ENDMETHOD.


*----------------------------------------------------------------------*
* METHOD salesorderitem_get_entityset                                  *
* Query Line Items from ZSO_ITEM (supports navigation and direct query)*
*----------------------------------------------------------------------*
  METHOD salesorderitem_get_entityset.
    DATA: lt_item    TYPE STANDARD TABLE OF zso_item,
          ls_item    TYPE zso_item,
          ls_entity  LIKE LINE OF et_entityset,
          lv_vbeln   TYPE zso_item-vbeln.

    " Check if navigation from Header (/SalesOrderHeaderSet('1001')/ToItems)
    READ TABLE it_key_tab INTO DATA(ls_key) WITH KEY name = 'VBELN'.
    IF sy-subrc = 0.
      lv_vbeln = |{ ls_key-value ALPHA = IN }|.
    ELSE.
      " Or check filter options
      IF io_tech_request_context IS BOUND.
        DATA(lt_filters) = io_tech_request_context->get_filter( )->get_filter_select_options( ).
        READ TABLE lt_filters INTO DATA(ls_f) WITH KEY property = 'VBELN'.
        IF sy-subrc = 0 AND ls_f-select_options IS NOT INITIAL.
          lv_vbeln = ls_f-select_options[ 1 ]-low.
        ENDIF.
      ENDIF.
    ENDIF.

    " Read items from ZSO_ITEM
    IF lv_vbeln IS NOT INITIAL.
      SELECT * FROM zso_item
        INTO TABLE @lt_item
        WHERE vbeln = @lv_vbeln
        ORDER BY posnr ASCENDING.
    ELSE.
      SELECT * FROM zso_item
        INTO TABLE @lt_item
        ORDER BY vbeln, posnr ASCENDING.
    ENDIF.

    LOOP AT lt_item INTO ls_item.
      CLEAR ls_entity.
      MOVE-CORRESPONDING ls_item TO ls_entity.
      ls_entity-qty        = ls_item-kwmeng.
      ls_entity-meins      = ls_item-vrkme.
      ls_entity-unit_price = ls_item-netpr.
      ls_entity-net_amount = ls_item-netwr.
      ls_entity-waers      = ls_item-waerk.
      ls_entity-maktx      = ls_item-arktx.
      APPEND ls_entity TO et_entityset.
    ENDLOOP.

  ENDMETHOD.


*----------------------------------------------------------------------*
* METHOD /iwbep/if_mgw_appl_srv_runtime~create_deep_entity             *
* Transactional Deep Insert: Creates Header (ZSO_HDR) + Items (ZSO_ITEM)*
* in a single atomic database LUW with Open SQL and Number Range       *
*----------------------------------------------------------------------*
  METHOD /iwbep/if_mgw_appl_srv_runtime~create_deep_entity.
    DATA: ls_deep_payload TYPE ty_deep_sales_order,
          ls_hdr_db       TYPE zso_hdr,
          lt_item_db      TYPE STANDARD TABLE OF zso_item,
          ls_item_db      TYPE zso_item,
          lv_new_vbeln    TYPE zso_hdr-vbeln,
          lv_total_amount TYPE zso_hdr-netwr,
          lv_item_posnr   TYPE n LENGTH 6,
          lv_idx          TYPE i.

    " 1. Deserialize the nested OData JSON/XML payload from frontend
    io_data_provider->read_entry_data( IMPORTING es_data = ls_deep_payload ).

    " 2. Validate mandatory business inputs
    IF ls_deep_payload-kunnr IS INITIAL.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid  = /iwbep/cx_mgw_busi_exception=>business_error
          message = 'Customer Number (KUNNR) is mandatory.'.
    ENDIF.

    IF ls_deep_payload-to_items IS INITIAL.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid  = /iwbep/cx_mgw_busi_exception=>business_error
          message = 'Sales Order must contain at least one line item.'.
    ENDIF.

    " 3. Determine Sales Order Number (generate via SNRO or validate manual input)
    IF ls_deep_payload-vbeln IS INITIAL.
      get_next_order_number( IMPORTING ev_vbeln = lv_new_vbeln ).
    ELSE.
      lv_new_vbeln = |{ ls_deep_payload-vbeln ALPHA = IN }|.
      SELECT SINGLE vbeln FROM zso_hdr INTO @DATA(lv_chk) WHERE vbeln = @lv_new_vbeln.
      IF sy-subrc = 0.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = |Sales Order ID { lv_new_vbeln } already exists in ZSO_HDR.|.
      ENDIF.
    ENDIF.

    ls_deep_payload-vbeln = lv_new_vbeln.

    " 4. Prepare Line Items and Calculate Line Amounts
    CLEAR: lv_total_amount, lt_item_db, lv_idx.

    LOOP AT ls_deep_payload-to_items ASSIGNING FIELD-SYMBOL(<ls_item>).
      lv_idx = lv_idx + 1.
      CLEAR ls_item_db.

      " Auto-assign POSNR in steps of 10 if not provided
      IF <ls_item>-posnr IS INITIAL.
        lv_item_posnr = lv_idx * 10.
        <ls_item>-posnr = |{ lv_item_posnr ALPHA = IN }|.
      ENDIF.

      " Validations
      IF <ls_item>-matnr IS INITIAL.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = |Material ID missing for line item { <ls_item>-posnr }.|.
      ENDIF.

      IF <ls_item>-qty <= 0.
        RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
          EXPORTING
            textid  = /iwbep/cx_mgw_busi_exception=>business_error
            message = |Quantity must be greater than zero for item { <ls_item>-posnr }.|.
      ENDIF.

      <ls_item>-vbeln      = lv_new_vbeln.
      <ls_item>-net_amount = <ls_item>-qty * <ls_item>-unit_price.
      lv_total_amount      = lv_total_amount + <ls_item>-net_amount.

      " Populate ZSO_ITEM DB structure
      ls_item_db-mandt  = sy-mandt.
      ls_item_db-vbeln  = lv_new_vbeln.
      ls_item_db-posnr  = <ls_item>-posnr.
      ls_item_db-matnr  = <ls_item>-matnr.
      ls_item_db-arktx  = <ls_item>-maktx.
      ls_item_db-kwmeng = <ls_item>-qty.
      ls_item_db-vrkme  = COND #( WHEN <ls_item>-meins IS NOT INITIAL THEN <ls_item>-meins ELSE 'EA' ).
      ls_item_db-netpr  = <ls_item>-unit_price.
      ls_item_db-netwr  = <ls_item>-net_amount.
      ls_item_db-waerk  = COND #( WHEN <ls_item>-waers IS NOT INITIAL THEN <ls_item>-waers ELSE 'EUR' ).

      APPEND ls_item_db TO lt_item_db.
    ENDLOOP.

    " 5. Prepare Header Record ZSO_HDR
    ls_hdr_db-mandt   = sy-mandt.
    ls_hdr_db-vbeln   = lv_new_vbeln.
    ls_hdr_db-kunnr   = ls_deep_payload-kunnr.
    ls_hdr_db-erdat   = COND #( WHEN ls_deep_payload-erdat IS NOT INITIAL THEN ls_deep_payload-erdat ELSE sy-datum ).
    ls_hdr_db-status  = COND #( WHEN ls_deep_payload-status IS NOT INITIAL THEN ls_deep_payload-status ELSE 'O' ).
    ls_hdr_db-waerk   = COND #( WHEN ls_deep_payload-currency IS NOT INITIAL THEN ls_deep_payload-currency ELSE 'EUR' ).
    ls_hdr_db-netwr   = lv_total_amount.
    ls_hdr_db-remarks = ls_deep_payload-remarks.
    ls_hdr_db-ernam   = sy-uname.
    ls_hdr_db-erzet   = sy-uzeit.

    " 6. Atomic Transactional Insert via Open SQL
    INSERT zso_hdr FROM @ls_hdr_db.
    IF sy-subrc <> 0.
      ROLLBACK WORK.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid  = /iwbep/cx_mgw_busi_exception=>business_error
          message = |Database insertion failed for Sales Order Header { lv_new_vbeln }.|.
    ENDIF.

    INSERT zso_item FROM TABLE @lt_item_db.
    IF sy-subrc <> 0.
      ROLLBACK WORK.
      RAISE EXCEPTION TYPE /iwbep/cx_mgw_busi_exception
        EXPORTING
          textid  = /iwbep/cx_mgw_busi_exception=>business_error
          message = |Database insertion failed for Sales Order Items { lv_new_vbeln }.|.
    ENDIF.

    " Commit LUW
    COMMIT WORK AND WAIT.

    " 7. Populate Return Response
    ls_deep_payload-total_amount = lv_total_amount.
    ls_deep_payload-item_count   = lines( lt_item_db ).
    ls_deep_payload-status_text  = COND #( WHEN ls_hdr_db-status = 'C' THEN 'Confirmed' ELSE 'Open' ).

    copy_data_to_ref(
      EXPORTING
        is_data = ls_deep_payload
      CHANGING
        cr_data = er_deep_entity
    ).

  ENDMETHOD.


*----------------------------------------------------------------------*
* METHOD get_next_order_number                                         *
* Generate next sequential Sales Order Number using Number Range ZSO_NR*
*----------------------------------------------------------------------*
  METHOD get_next_order_number.
    DATA: lv_number TYPE clike.

    CALL FUNCTION 'NUMBER_GET_NEXT'
      EXPORTING
        nr_range_nr             = '01'
        object                  = 'ZSO_NR'
      IMPORTING
        number                  = lv_number
      EXCEPTIONS
        interval_not_found      = 1
        number_range_not_intern = 2
        object_not_found        = 3
        quantity_is_0           = 4
        quantity_not_1          = 5
        interval_overflow       = 6
        buffer_overflow         = 7
        OTHERS                  = 8.

    IF sy-subrc = 0.
      ev_vbeln = lv_number.
    ELSE.
      " Fallback to max + 1 logic if number range not maintained in dev
      SELECT MAX( vbeln ) FROM zso_hdr INTO @DATA(lv_max).
      IF sy-subrc = 0 AND lv_max IS NOT INITIAL.
        ev_vbeln = |{ ( lv_max + 1 ) ALPHA = IN }|.
      ELSE.
        ev_vbeln = '0000001001'.
      ENDIF.
    ENDIF.
  ENDMETHOD.


*----------------------------------------------------------------------*
* METHOD customer_get_entityset                                        *
* Value Help Query for Customers from KNA1                             *
*----------------------------------------------------------------------*
  METHOD customer_get_entityset.
    DATA: lt_kna1 TYPE STANDARD TABLE OF kna1,
          ls_kna1 TYPE kna1,
          ls_cust TYPE zcl_zsales_order_mpc=>ts_customer.

    SELECT kunnr, name1, ort01 AS city, land1 AS country, pstlz AS postalcode, telf1 AS telephone
      FROM kna1
      UP TO 100 ROWS
      INTO CORRESPONDING FIELDS OF TABLE @lt_kna1.

    LOOP AT lt_kna1 INTO ls_kna1.
      CLEAR ls_cust.
      ls_cust-kunnr        = ls_kna1-kunnr.
      ls_cust-name1        = ls_kna1-name1.
      ls_cust-city         = ls_kna1-ort01.
      ls_cust-country      = ls_kna1-land1.
      ls_cust-postal_code  = ls_kna1-pstlz.
      ls_cust-telephone    = ls_kna1-telf1.
      ls_cust-credit_limit = 200000.
      ls_cust-payment_terms = 'NT30'.
      APPEND ls_cust TO et_entityset.
    ENDLOOP.
  ENDMETHOD.


*----------------------------------------------------------------------*
* METHOD material_get_entityset                                        *
* Value Help Query for Materials from MARA & MAKT                      *
*----------------------------------------------------------------------*
  METHOD material_get_entityset.
    DATA: BEGIN OF ty_mat_db,
            matnr TYPE mara-matnr,
            meins TYPE mara-meins,
            matkl TYPE mara-matkl,
            maktx TYPE makt-maktx,
          END OF ty_mat_db,
          lt_mat_db TYPE STANDARD TABLE OF ty_mat_db,
          ls_mat_db LIKE LINE OF lt_mat_db,
          ls_mat    TYPE zcl_zsales_order_mpc=>ts_material.

    SELECT a~matnr, a~meins, a~matkl, b~maktx
      FROM mara AS a
      INNER JOIN makt AS b ON b~matnr = a~matnr AND b~spras = @sy-langu
      UP TO 100 ROWS
      INTO CORRESPONDING FIELDS OF TABLE @lt_mat_db.

    LOOP AT lt_mat_db INTO ls_mat_db.
      CLEAR ls_mat.
      ls_mat-matnr           = ls_mat_db-matnr.
      ls_mat-maktx           = ls_mat_db-maktx.
      ls_mat-meins           = ls_mat_db-meins.
      ls_mat-matkl           = ls_mat_db-matkl.
      ls_mat-waers           = 'EUR'.
      ls_mat-unit_price      = 500.
      ls_mat-stock_available = 100.
      APPEND ls_mat TO et_entityset.
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.
