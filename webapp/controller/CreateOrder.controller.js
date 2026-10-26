sap.ui.define([
  "sap/fiori/salesorder/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/fiori/salesorder/model/formatter",
  "sap/ui/core/Fragment",
  "sap/m/MessageBox",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, formatter, Fragment, MessageBox, Filter, FilterOperator) {
  "use strict";

  return BaseController.extend("sap.fiori.salesorder.controller.CreateOrder", {
    formatter: formatter,

    onInit: function () {
      this.getRouter().getRoute("createOrder").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function () {
      this._resetForm();
    },

    /**
     * Resets the form model to clean initial state
     * @private
     */
    _resetForm: function () {
      var sToday = new Date().toISOString().split("T")[0];

      var oModel = new JSONModel({
        header: {
          Vbeln: "",
          Kunnr: "",
          CustomerName: "",
          Erdat: sToday,
          Status: "O",
          Currency: "EUR",
          Remarks: ""
        },
        items: [
          {
            Posnr: "000010",
            Matnr: "",
            Maktx: "",
            Qty: 1,
            Meins: "EA",
            UnitPrice: 0.00,
            NetAmount: 0.00
          }
        ],
        calculated: {
          subtotal: 0.00,
          tax: 0.00,
          grandTotal: 0.00
        },
        validation: {
          kunnrState: "None",
          kunnrStateText: "",
          dateState: "None"
        }
      });

      this.setModel(oModel, "createOrder");
      this.onRecalculateAmounts();
    },

    /**
     * Recalculates NetAmount per item and Order Subtotal & Grand Total
     */
    onRecalculateAmounts: function () {
      var oModel = this.getModel("createOrder");
      if (!oModel) {
        return;
      }

      var aItems = oModel.getProperty("/items") || [];
      var fSubtotal = 0;

      aItems.forEach(function (item) {
        var fQty = parseFloat(item.Qty) || 0;
        var fPrice = parseFloat(item.UnitPrice) || 0;
        var fNet = Math.round(fQty * fPrice * 100) / 100;
        item.NetAmount = fNet;
        fSubtotal += fNet;
      });

      fSubtotal = Math.round(fSubtotal * 100) / 100;
      var fTax = Math.round(fSubtotal * 0.19 * 100) / 100;
      var fGrandTotal = Math.round((fSubtotal + fTax) * 100) / 100;

      oModel.setProperty("/items", aItems);
      oModel.setProperty("/calculated/subtotal", fSubtotal);
      oModel.setProperty("/calculated/tax", fTax);
      oModel.setProperty("/calculated/grandTotal", fGrandTotal);
    },

    /**
     * Adds a new line item with incremented POSNR
     */
    onAddItem: function () {
      var oModel = this.getModel("createOrder");
      var aItems = oModel.getProperty("/items") || [];

      // Find highest posnr
      var iMaxPosnr = 0;
      aItems.forEach(function (item) {
        var num = parseInt(item.Posnr, 10);
        if (!isNaN(num) && num > iMaxPosnr) {
          iMaxPosnr = num;
        }
      });

      var nextPos = iMaxPosnr + 10;
      var sPosnr = String(nextPos);
      while (sPosnr.length < 6) {
        sPosnr = "0" + sPosnr;
      }

      aItems.push({
        Posnr: sPosnr,
        Matnr: "",
        Maktx: "",
        Qty: 1,
        Meins: "EA",
        UnitPrice: 0.00,
        NetAmount: 0.00
      });

      oModel.setProperty("/items", aItems);
      this.onRecalculateAmounts();
      this.showMessageToast("Added item " + sPosnr);
    },

    /**
     * Removes line item at row index
     * @param {sap.ui.base.Event} oEvent Button press event
     */
    onRemoveItem: function (oEvent) {
      var oBtn = oEvent.getSource();
      var oItem = oBtn.getParent();
      var oTable = this.byId("tblCreateItems");
      var iIndex = oTable.indexOfItem(oItem);

      var oModel = this.getModel("createOrder");
      var aItems = oModel.getProperty("/items") || [];

      if (aItems.length <= 1) {
        this.showMessageToast("An order requires at least one item.");
        return;
      }

      if (iIndex !== -1) {
        var sDeletedPosnr = aItems[iIndex].Posnr;
        aItems.splice(iIndex, 1);
        oModel.setProperty("/items", aItems);
        this.onRecalculateAmounts();
        this.showMessageToast("Removed item " + sDeletedPosnr);
      }
    },

    onVbelnLiveChange: function (oEvent) {
      var sVal = oEvent.getParameter("value");
      if (sVal && !/^[0-9a-zA-Z_-]*$/.test(sVal)) {
        oEvent.getSource().setValueState("Warning");
        oEvent.getSource().setValueStateText("Only alphanumeric characters permitted for Sales Order ID");
      } else {
        oEvent.getSource().setValueState("None");
      }
    },

    onDateChange: function (oEvent) {
      var bValid = oEvent.getParameter("valid");
      var oModel = this.getModel("createOrder");
      if (!bValid) {
        oModel.setProperty("/validation/dateState", "Error");
      } else {
        oModel.setProperty("/validation/dateState", "None");
      }
    },

    onKunnrChange: function (oEvent) {
      var that = this;
      var sVal = oEvent.getParameter("value");
      var oModel = this.getModel("createOrder");

      if (!sVal || sVal.trim() === "") {
        oModel.setProperty("/header/CustomerName", "");
        oModel.setProperty("/validation/kunnrState", "Error");
        oModel.setProperty("/validation/kunnrStateText", that.getText("errCustomerRequired"));
        return;
      }

      this.getOrderService().getCustomers().then(function (aCusts) {
        var oFound = aCusts.find(function (c) {
          return c.Kunnr.toLowerCase() === sVal.toLowerCase().trim();
        });

        if (oFound) {
          oModel.setProperty("/header/Kunnr", oFound.Kunnr);
          oModel.setProperty("/header/CustomerName", oFound.Name1);
          oModel.setProperty("/validation/kunnrState", "None");
          oModel.setProperty("/validation/kunnrStateText", "");
        } else {
          oModel.setProperty("/validation/kunnrState", "Warning");
          oModel.setProperty("/validation/kunnrStateText", "Customer not found in master data. Please select via Value Help.");
        }
      });
    },

    /* ======================================================= */
    /* Customer Value Help Handlers                            */
    /* ======================================================= */

    onCustomerValueHelpRequest: function () {
      var that = this;
      var oView = this.getView();

      if (!this._pCustomerVHDialog) {
        this._pCustomerVHDialog = Fragment.load({
          id: oView.getId(),
          name: "sap.fiori.salesorder.fragment.CustomerValueHelpDialog",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          oDialog.setModel(new JSONModel({ list: [] }), "customerVH");
          return oDialog;
        });
      }

      this._pCustomerVHDialog.then(function (oDialog) {
        that.getOrderService().getCustomers().then(function (aCusts) {
          oDialog.getModel("customerVH").setProperty("/list", aCusts);
          oDialog.open();
        });
      });
    },

    onCustomerValueHelpSearch: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      var oFilter = new Filter({
        filters: [
          new Filter("Kunnr", FilterOperator.Contains, sValue),
          new Filter("Name1", FilterOperator.Contains, sValue),
          new Filter("City", FilterOperator.Contains, sValue)
        ],
        and: false
      });
      var oBinding = oEvent.getSource().getBinding("items");
      oBinding.filter([oFilter]);
    },

    onCustomerValueHelpConfirm: function (oEvent) {
      var oSelectedItem = oEvent.getParameter("selectedItem");
      if (oSelectedItem) {
        var oCtx = oSelectedItem.getBindingContext("customerVH");
        var oCust = oCtx.getObject();

        var oModel = this.getModel("createOrder");
        oModel.setProperty("/header/Kunnr", oCust.Kunnr);
        oModel.setProperty("/header/CustomerName", oCust.Name1);
        oModel.setProperty("/validation/kunnrState", "None");
        oModel.setProperty("/validation/kunnrStateText", "");
      }
    },

    onCustomerValueHelpCancel: function () {
      // Clean dialog state if needed
    },

    /* ======================================================= */
    /* Material Value Help Handlers                            */
    /* ======================================================= */

    onMaterialValueHelpRequest: function (oEvent) {
      var that = this;
      var oInput = oEvent.getSource();
      var oRowContext = oInput.getBindingContext("createOrder");
      this._sActiveItemPath = oRowContext.getPath();

      var oView = this.getView();

      if (!this._pMaterialVHDialog) {
        this._pMaterialVHDialog = Fragment.load({
          id: oView.getId(),
          name: "sap.fiori.salesorder.fragment.MaterialValueHelpDialog",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          oDialog.setModel(new JSONModel({ list: [] }), "materialVH");
          return oDialog;
        });
      }

      this._pMaterialVHDialog.then(function (oDialog) {
        that.getOrderService().getMaterials().then(function (aMats) {
          oDialog.getModel("materialVH").setProperty("/list", aMats);
          oDialog.open();
        });
      });
    },

    onMaterialValueHelpSearch: function (oEvent) {
      var sValue = oEvent.getParameter("value");
      var oFilter = new Filter({
        filters: [
          new Filter("Matnr", FilterOperator.Contains, sValue),
          new Filter("Maktx", FilterOperator.Contains, sValue),
          new Filter("Matkl", FilterOperator.Contains, sValue)
        ],
        and: false
      });
      var oBinding = oEvent.getSource().getBinding("items");
      oBinding.filter([oFilter]);
    },

    onMaterialValueHelpConfirm: function (oEvent) {
      var oSelectedItem = oEvent.getParameter("selectedItem");
      if (oSelectedItem && this._sActiveItemPath) {
        var oCtx = oSelectedItem.getBindingContext("materialVH");
        var oMat = oCtx.getObject();

        var oModel = this.getModel("createOrder");
        oModel.setProperty(this._sActiveItemPath + "/Matnr", oMat.Matnr);
        oModel.setProperty(this._sActiveItemPath + "/Maktx", oMat.Maktx);
        oModel.setProperty(this._sActiveItemPath + "/Meins", oMat.Meins);
        oModel.setProperty(this._sActiveItemPath + "/UnitPrice", oMat.UnitPrice);

        this.onRecalculateAmounts();
        this.showMessageToast("Selected material: " + oMat.Matnr);
      }
    },

    onMaterialValueHelpCancel: function () {
      this._sActiveItemPath = null;
    },

    /* ======================================================= */
    /* Validations & Save Transaction                          */
    /* ======================================================= */

    /**
     * Validates header and line items according to SAP business rules
     * @returns {boolean} True if all validations pass
     * @private
     */
    _validateOrder: function () {
      var oModel = this.getModel("createOrder");
      var oHeader = oModel.getProperty("/header");
      var aItems = oModel.getProperty("/items") || [];

      // 1. Customer validation
      if (!oHeader.Kunnr || oHeader.Kunnr.trim() === "") {
        oModel.setProperty("/validation/kunnrState", "Error");
        oModel.setProperty("/validation/kunnrStateText", this.getText("errCustomerRequired"));
        this.showErrorMessage(this.getText("errCustomerRequired"));
        return false;
      }

      // 2. Order date validation
      if (!oHeader.Erdat) {
        oModel.setProperty("/validation/dateState", "Error");
        this.showErrorMessage(this.getText("errDateRequired"));
        return false;
      }

      // 3. At least one line item
      if (aItems.length === 0) {
        this.showErrorMessage(this.getText("errAtLeastOneItem"));
        return false;
      }

      // 4. Duplicate item number (POSNR) check
      var oSeenPosnr = {};
      for (var i = 0; i < aItems.length; i++) {
        var sPosnr = aItems[i].Posnr ? aItems[i].Posnr.trim() : "";
        if (!sPosnr) {
          this.showErrorMessage("Item number is missing at row " + (i + 1));
          return false;
        }
        if (oSeenPosnr[sPosnr]) {
          this.showErrorMessage(this.getText("errDuplicateItem", [sPosnr]));
          return false;
        }
        oSeenPosnr[sPosnr] = true;
      }

      // 5. Line item fields (Material, Quantity > 0, Price >= 0)
      for (var j = 0; j < aItems.length; j++) {
        var item = aItems[j];
        if (!item.Matnr || item.Matnr.trim() === "") {
          this.showErrorMessage(this.getText("errMaterialRequired", [item.Posnr]));
          return false;
        }

        var fQty = parseFloat(item.Qty);
        if (isNaN(fQty) || fQty <= 0) {
          this.showErrorMessage(this.getText("errQuantityPositive", [item.Posnr]));
          return false;
        }

        var fPrice = parseFloat(item.UnitPrice);
        if (isNaN(fPrice) || fPrice < 0) {
          this.showErrorMessage(this.getText("errPricePositive", [item.Posnr]));
          return false;
        }
      }

      return true;
    },

    /**
     * Executes order creation (Transaction deep insert into ZSO_HDR + ZSO_ITEM)
     */
    onSaveOrder: function () {
      var that = this;

      if (!this._validateOrder()) {
        return;
      }

      this.onRecalculateAmounts();

      var oModel = this.getModel("createOrder");
      var oHeader = oModel.getProperty("/header");
      var aItems = oModel.getProperty("/items");
      var oCalculated = oModel.getProperty("/calculated");

      var oPayload = {
        Vbeln: oHeader.Vbeln ? oHeader.Vbeln.trim() : "",
        Kunnr: oHeader.Kunnr.trim(),
        CustomerName: oHeader.CustomerName || ("Customer " + oHeader.Kunnr),
        Erdat: oHeader.Erdat,
        Status: oHeader.Status || "O",
        Currency: oHeader.Currency || "EUR",
        TotalAmount: oCalculated.subtotal,
        Remarks: oHeader.Remarks || "",
        Items: aItems
      };

      this.getModel("appView").setProperty("/busy", true);

      this.getOrderService().createSalesOrder(oPayload)
        .then(function (oCreatedOrder) {
          that.showSuccessMessage(
            that.getText("msgOrderCreatedSuccess", [oCreatedOrder.Vbeln]),
            "Sales Order Created",
            function () {
              // Navigate to detail view of created order
              that.getRouter().navTo("orderDetail", {
                vbeln: oCreatedOrder.Vbeln
              });
            }
          );
        })
        .catch(function (err) {
          that.showErrorMessage("Failed to create sales order: " + (err.message || err));
        })
        .finally(function () {
          that.getModel("appView").setProperty("/busy", false);
        });
    },

    onCancel: function () {
      var that = this;
      MessageBox.confirm("Are you sure you want to discard changes and leave this page?", {
        title: "Discard Changes",
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            that.onNavBack("orderList");
          }
        }
      });
    }
  });
});
