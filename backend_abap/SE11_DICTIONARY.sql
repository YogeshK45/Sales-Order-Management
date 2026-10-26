*======================================================================*
* SAP SE11 DATA DICTIONARY DEFINITIONS                                 *
* Sales Order Management System (Traditional ABAP)                     *
* Database Tables: ZSO_HDR & ZSO_ITEM                                  *
*======================================================================*

------------------------------------------------------------------------
-- 1. DOMAINS (Transaction SE11 -> Domain)
------------------------------------------------------------------------

-- Domain: ZDO_VBELN
-- Description: Sales Order Number Domain
-- Data Type:   CHAR
-- Length:      10
-- Output Len:  10
-- Convers. Routine: ALPHA

-- Domain: ZDO_POSNR
-- Description: Sales Order Item Number Domain
-- Data Type:   NUMC
-- Length:      6
-- Output Len:  6

-- Domain: ZDO_STATUS
-- Description: Sales Order Processing Status
-- Data Type:   CHAR
-- Length:      1
-- Values:
--   'O' -> Open (Newly created, pending review)
--   'C' -> Confirmed (Approved for warehouse fulfillment)
--   'X' -> Cancelled (Voided or cancelled)

------------------------------------------------------------------------
-- 2. DATA ELEMENTS (Transaction SE11 -> Data Element)
------------------------------------------------------------------------

-- Data Element: ZDE_VBELN
-- Domain:       ZDO_VBELN
-- Short Text:   Sales Order Number
-- Field Labels: Order (10), Order ID (15), Sales Order ID (20)

-- Data Element: ZDE_POSNR
-- Domain:       ZDO_POSNR
-- Short Text:   Sales Order Item Number
-- Field Labels: Item (6), Item No (10), Sales Item (20)

-- Data Element: ZDE_STATUS
-- Domain:       ZDO_STATUS
-- Short Text:   Order Status Flag
-- Field Labels: Stat (4), Status (10), Order Status (20)

-- Data Element: ZDE_NETWR
-- Domain:       WERTV8 (Standard SAP Currency Domain)
-- Short Text:   Net Value in Document Currency
-- Ref Table:    ZSO_HDR (or ZSO_ITEM)
-- Ref Field:    WAERK

-- Data Element: ZDE_MENGE
-- Domain:       MENG13 (Standard SAP Quantity Domain)
-- Short Text:   Sales Order Quantity
-- Ref Table:    ZSO_ITEM
-- Ref Field:    VRKME

------------------------------------------------------------------------
-- 3. DATABASE TABLE: ZSO_HDR (Transaction SE11 -> Database Table)
------------------------------------------------------------------------
-- Short Description: Sales Order Header Table
-- Delivery Class:    A (Application table, master and transaction data)
-- Data Browser/Table View Maint: Display/Maintenance Allowed

CREATE TABLE zso_hdr (
  mandt      TYPE mandt        NOT NULL,  -- Client (Key)
  vbeln      TYPE zde_vbeln    NOT NULL,  -- Sales Order ID (Key)
  kunnr      TYPE kunnr        NOT NULL,  -- Customer Number (Maps to KNA1-KUNNR)
  erdat      TYPE erdat        NOT NULL,  -- Order Creation Date (DATS)
  status     TYPE zde_status   NOT NULL,  -- Status ('O', 'C', 'X')
  waerk      TYPE waers,                  -- Document Currency (e.g. EUR, USD)
  netwr      TYPE zde_netwr,              -- Total Net Value
  remarks    TYPE char255,                -- Internal / Customer Remarks
  ernam      TYPE ernam,                  -- Name of Person who Created the Object
  erzet      TYPE erzet,                  -- Creation Time
  aedat      TYPE aedat,                  -- Last Change Date
  aenam      TYPE aenam,                  -- Last Changed By
  PRIMARY KEY (mandt, vbeln)
);

-- Technical Settings for ZSO_HDR:
--   Data Class:       APPL0 (Master data, transparent tables)
--   Size Category:    1 (Expected records: 10,000 to 50,000)
--   Buffering:        Buffering allowed, but switched off (transaction table)
--   Log Data Changes: Checked (Recommended for sales documents)

------------------------------------------------------------------------
-- 4. DATABASE TABLE: ZSO_ITEM (Transaction SE11 -> Database Table)
------------------------------------------------------------------------
-- Short Description: Sales Order Line Item Table
-- Delivery Class:    A (Application table)
-- Data Browser/Table View Maint: Display/Maintenance Allowed

CREATE TABLE zso_item (
  mandt      TYPE mandt        NOT NULL,  -- Client (Key)
  vbeln      TYPE zde_vbeln    NOT NULL,  -- Sales Order ID (Key)
  posnr      TYPE zde_posnr    NOT NULL,  -- Item Number (Key) - e.g. 000010, 000020
  matnr      TYPE matnr        NOT NULL,  -- Material ID (Maps to MARA-MATNR)
  arktx      TYPE arktx,                  -- Short Description (Maps to MAKT-MAKTX)
  kwmeng     TYPE zde_menge,              -- Cumulative Order Quantity (DEC 13,3)
  vrkme      TYPE vrkme,                  -- Sales Unit of Measure (UNIT 3)
  netpr      TYPE zde_netwr,              -- Net Unit Price (CURR 15,2)
  netwr      TYPE zde_netwr,              -- Net Amount = kwmeng * netpr (CURR 15,2)
  waerk      TYPE waers,                  -- Currency Key (CUKY 5)
  PRIMARY KEY (mandt, vbeln, posnr)
);

-- Foreign Key Definition on ZSO_ITEM:
--   Foreign Key Field: MANDT -> Check Table: ZSO_HDR-MANDT
--   Foreign Key Field: VBELN -> Check Table: ZSO_HDR-VBELN
--   Cardinality:       1 : N (One Header to Many Items)

-- Currency/Quantity Field Assignment in SE11:
--   Field NETPR -> Reference Table: ZSO_ITEM, Reference Field: WAERK
--   Field NETWR -> Reference Table: ZSO_ITEM, Reference Field: WAERK
--   Field KWMENG -> Reference Table: ZSO_ITEM, Reference Field: VRKME

------------------------------------------------------------------------
-- 5. NUMBER RANGE OBJECT: ZSO_NR (Transaction SNRO)
------------------------------------------------------------------------
-- Object:               ZSO_NR
-- Short Text:           Sales Order Number Range
-- Subobject:            No
-- Number Length Domain: ZDO_VBELN (Length 10)
-- Warning %:            10%
-- Intervals:
--   No | From Number  | To Number    | Current Number | Ext
--   01 | 0000001000   | 0000009999   | 0000001006     | [ ]
