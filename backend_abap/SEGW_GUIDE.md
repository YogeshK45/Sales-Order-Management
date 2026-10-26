# SAP Gateway Service Builder (SEGW) Project Guide
## Traditional ABAP OData V2 Service Implementation

This guide provides step-by-step instructions for Senior SAP Technical Consultants to configure and activate the **Sales Order Management OData V2 Gateway Service** using Transaction `SEGW` (Service Builder) and `/IWFND/MAINT_SERVICE`.

---

### 1. Create SEGW Project

1. Open **SAP GUI** and launch Transaction **`SEGW`**.
2. Click **Create Project** icon (or `Ctrl+F1`).
3. Enter Project Attributes:
   - **Project:** `ZSALES_ORDER`
   - **Description:** Sales Order Management System (ZSO_HDR / ZSO_ITEM)
   - **Generation Strategy:** Standard
   - **Package:** `$TMP` (Local Object) or your target transportable package (e.g., `ZSD_PACKAGE`).

---

### 2. Define Data Model Artifacts

#### A. Entity Type 1: `SalesOrderHeader`
- **Entity Type Name:** `SalesOrderHeader`
- **Entity Set Name:** `SalesOrderHeaderSet`
- **Key Field:** `Vbeln` (Edm.String, MaxLength 10)
- **Properties:**
  | Property | EDM Core Type | MaxLength / Prec. | Scale | Label | ABAP Field (ZSO_HDR) |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `Vbeln` **[Key]** | `Edm.String` | 10 | - | Sales Order ID | `VBELN` |
  | `Kunnr` | `Edm.String` | 10 | - | Customer ID | `KUNNR` |
  | `CustomerName` | `Edm.String` | 35 | - | Customer Name | Calculated from KNA1 |
  | `Erdat` | `Edm.DateTime` | 7 | - | Order Date | `ERDAT` |
  | `Status` | `Edm.String` | 1 | - | Status Code ('O','C','X') | `STATUS` |
  | `StatusText` | `Edm.String` | 20 | - | Status Description | Formatted Text |
  | `Currency` | `Edm.String` | 5 | - | Currency Code | `WAERK` |
  | `TotalAmount` | `Edm.Decimal` | 15 | 2 | Net Total Value | `NETWR` |
  | `ItemCount` | `Edm.Int32` | - | - | Total Line Items | Calculated |
  | `Remarks` | `Edm.String` | 255 | - | Notes / Remarks | `REMARKS` |

#### B. Entity Type 2: `SalesOrderItem`
- **Entity Type Name:** `SalesOrderItem`
- **Entity Set Name:** `SalesOrderItemSet`
- **Key Fields:** `Vbeln` (Edm.String 10), `Posnr` (Edm.String 6)
- **Properties:**
  | Property | EDM Core Type | MaxLength / Prec. | Scale | Label | ABAP Field (ZSO_ITEM) |
  | :--- | :--- | :--- | :--- | :--- | :--- |
  | `Vbeln` **[Key]** | `Edm.String` | 10 | - | Sales Order ID | `VBELN` |
  | `Posnr` **[Key]** | `Edm.String` | 6 | - | Item Number | `POSNR` |
  | `Matnr` | `Edm.String` | 18 | - | Material ID | `MATNR` |
  | `Maktx` | `Edm.String` | 40 | - | Description | `ARKTX` / MAKTX |
  | `Qty` | `Edm.Decimal` | 13 | 3 | Quantity | `KWMENG` |
  | `Meins` | `Edm.String` | 3 | - | Unit of Measure | `VRKME` |
  | `UnitPrice` | `Edm.Decimal` | 15 | 2 | Unit Price | `NETPR` |
  | `NetAmount` | `Edm.Decimal` | 15 | 2 | Net Amount | `NETWR` |
  | `Waers` | `Edm.String` | 5 | - | Currency Key | `WAERK` |

#### C. Entity Type 3: `Customer` (Value Help)
- **Entity Type Name:** `Customer`
- **Entity Set Name:** `CustomerSet`
- **Key Field:** `Kunnr` (Edm.String 10)
- **Properties:** `Kunnr`, `Name1`, `City`, `Country`, `PostalCode`, `Telephone`, `Email`, `CreditLimit`, `PaymentTerms`.

#### D. Entity Type 4: `Material` (Value Help)
- **Entity Type Name:** `Material`
- **Entity Set Name:** `MaterialSet`
- **Key Field:** `Matnr` (Edm.String 18)
- **Properties:** `Matnr`, `Maktx`, `Meins`, `UnitPrice`, `Waers`, `Matkl`, `StockAvailable`.

---

### 3. Define Association & Navigation Property

1. Right-click on **Associations** -> **Create**.
   - **Association Name:** `Assoc_Header_Item`
   - **Principal Entity:** `SalesOrderHeader` (Multiplicity: `1`)
   - **Dependent Entity:** `SalesOrderItem` (Multiplicity: `*` / `0..n`)
2. Define Referential Constraint:
   - Principal Key `Vbeln` = Dependent Key `Vbeln`
3. Generate Navigation Property:
   - On `SalesOrderHeader`: **Navigation Property:** `ToItems` (Target: `SalesOrderItem`, Relationship: `Assoc_Header_Item`)
   - On `SalesOrderItem`: **Navigation Property:** `ToHeader` (Target: `SalesOrderHeader`, Relationship: `Assoc_Header_Item`)

---

### 4. Generate Runtime Objects

Click the **Generate Runtime Objects** button (`Ctrl+F3`):
- **Model Provider Class (MPC):** `ZCL_ZSALES_ORDER_MPC`
- **Model Provider Extension (MPC_EXT):** `ZCL_ZSALES_ORDER_MPC_EXT`
- **Data Provider Class (DPC):** `ZCL_ZSALES_ORDER_DPC`
- **Data Provider Extension (DPC_EXT):** `ZCL_ZSALES_ORDER_DPC_EXT`
- **Technical Service Name:** `ZSALES_ORDER_SRV` (Version 1)

> **Important:** Always implement your custom logic in the Extension classes (**`ZCL_ZSALES_ORDER_DPC_EXT`**). Never modify the generated base classes (`DPC` / `MPC`) as they are overwritten upon model re-generation.

---

### 5. Service Activation in SAP Gateway

1. Open Transaction **`/IWFND/MAINT_SERVICE`**.
2. Click **Add Service** button.
3. Select System Alias: `LOCAL` (or your backend RFC destination).
4. Enter Technical Service Name: `ZSALES_ORDER_SRV*` and press Enter.
5. Select `ZSALES_ORDER_SRV` and click **Add Selected Service**.
6. Set Package Assignment (e.g. `$TMP` or transport package) and confirm.
7. Return to `/IWFND/MAINT_SERVICE` and verify the status indicator turns **Green**.

---

### 6. Verify via SAP Gateway Client (`/IWFND/GW_CLIENT`)

Execute the following test requests:

1. **Service Document:**
   ```http
   GET /sap/opu/odata/sap/ZSALES_ORDER_SRV/?$format=json
   ```
2. **Metadata Document:**
   ```http
   GET /sap/opu/odata/sap/ZSALES_ORDER_SRV/$metadata
   ```
3. **Query Sales Order Headers:**
   ```http
   GET /sap/opu/odata/sap/ZSALES_ORDER_SRV/SalesOrderHeaderSet?$top=5&$format=json
   ```
4. **Read Order with Line Items (Expanded Navigation):**
   ```http
   GET /sap/opu/odata/sap/ZSALES_ORDER_SRV/SalesOrderHeaderSet('0000001001')?$expand=ToItems&$format=json
   ```
5. **Customer Value Help Query:**
   ```http
   GET /sap/opu/odata/sap/ZSALES_ORDER_SRV/CustomerSet?$filter=substringof('Acme',Name1)&$format=json
   ```
