sap.ui.define([
  "sap/fiori/salesorder/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/fiori/salesorder/model/formatter",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment"
], function (BaseController, JSONModel, formatter, MessageBox, Fragment) {
  "use strict";

  return BaseController.extend("sap.fiori.salesorder.controller.OrderDetail", {
    formatter: formatter,

    onInit: function () {
      var oDetailModel = new JSONModel();
      this.setModel(oDetailModel, "orderDetail");

      this.getRouter().getRoute("orderDetail").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      var sVbeln = oEvent.getParameter("arguments").vbeln;
      this._sCurrentVbeln = sVbeln;
      this.loadOrderDetail(sVbeln);
    },

    /**
     * Loads order details with items and calculated totals
     * @param {string} sVbeln Sales Order ID
     */
    loadOrderDetail: function (sVbeln) {
      var that = this;
      this.getModel("appView").setProperty("/busy", true);

      this.getOrderService().getSalesOrder(sVbeln)
        .then(function (oOrder) {
          var fTotal = parseFloat(oOrder.TotalAmount) || 0;
          var fTax = Math.round(fTotal * 0.19 * 100) / 100;
          var fGrandTotal = Math.round((fTotal + fTax) * 100) / 100;

          oOrder.calculatedTax = fTax;
          oOrder.calculatedGrandTotal = fGrandTotal;

          that.getModel("orderDetail").setData(oOrder);
        })
        .catch(function (err) {
          that.showErrorMessage("Failed to load Sales Order " + sVbeln + ": " + (err.message || err));
        })
        .finally(function () {
          that.getModel("appView").setProperty("/busy", false);
        });
    },

    onConfirmOrder: function () {
      var that = this;
      var sVbeln = this._sCurrentVbeln;

      MessageBox.confirm(that.getText("msgConfirmOrder", [sVbeln]), {
        title: "Confirm Sales Order",
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            that.getModel("appView").setProperty("/busy", true);
            that.getOrderService().updateSalesOrder(sVbeln, { Status: "C" })
              .then(function () {
                that.showMessageToast(that.getText("msgStatusChanged", ["Confirmed"]));
                that.loadOrderDetail(sVbeln);
              })
              .catch(function (err) {
                that.showErrorMessage("Update failed: " + (err.message || err));
              })
              .finally(function () {
                that.getModel("appView").setProperty("/busy", false);
              });
          }
        }
      });
    },

    onCancelOrder: function () {
      var that = this;
      var sVbeln = this._sCurrentVbeln;

      MessageBox.confirm(that.getText("msgConfirmCancel", [sVbeln]), {
        title: "Cancel Sales Order",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) {
            that.getModel("appView").setProperty("/busy", true);
            that.getOrderService().updateSalesOrder(sVbeln, { Status: "X" })
              .then(function () {
                that.showMessageToast(that.getText("msgStatusChanged", ["Cancelled"]));
                that.loadOrderDetail(sVbeln);
              })
              .catch(function (err) {
                that.showErrorMessage("Update failed: " + (err.message || err));
              })
              .finally(function () {
                that.getModel("appView").setProperty("/busy", false);
              });
          }
        }
      });
    },

    onDeleteOrder: function () {
      var that = this;
      var sVbeln = this._sCurrentVbeln;

      MessageBox.confirm(that.getText("msgConfirmDelete", [sVbeln]), {
        title: "Delete Sales Order",
        actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.DELETE,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.DELETE) {
            that.getModel("appView").setProperty("/busy", true);
            that.getOrderService().deleteSalesOrder(sVbeln)
              .then(function () {
                that.showMessageToast(that.getText("msgOrderDeletedSuccess", [sVbeln]));
                that.getRouter().navTo("orderList", {}, true);
              })
              .catch(function (err) {
                that.showErrorMessage("Delete failed: " + (err.message || err));
              })
              .finally(function () {
                that.getModel("appView").setProperty("/busy", false);
              });
          }
        }
      });
    },

    onOpenEditDialog: function () {
      var that = this;
      var oView = this.getView();
      var oCurrentOrder = this.getModel("orderDetail").getData();

      if (!this._pEditDialog) {
        this._pEditDialog = Fragment.load({
          id: oView.getId(),
          name: "sap.fiori.salesorder.fragment.EditOrderDialog",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          oDialog.setModel(new JSONModel(), "editOrder");
          return oDialog;
        });
      }

      this._pEditDialog.then(function (oDialog) {
        // Populate edit model with current values
        oDialog.getModel("editOrder").setData({
          Vbeln: oCurrentOrder.Vbeln,
          Status: oCurrentOrder.Status,
          CustomerName: oCurrentOrder.CustomerName,
          Remarks: oCurrentOrder.Remarks
        });
        oDialog.open();
      });
    },

    onSaveEditOrder: function () {
      var that = this;
      var oEditModel = this.getView().getModel("editOrder") || (this._pEditDialog && this.byId("editOrderDialog").getModel("editOrder"));
      var oData = oEditModel.getData();
      var sVbeln = oData.Vbeln;

      this.getModel("appView").setProperty("/busy", true);
      this.getOrderService().updateSalesOrder(sVbeln, {
        Status: oData.Status,
        CustomerName: oData.CustomerName,
        Remarks: oData.Remarks
      })
      .then(function () {
        that.byId("editOrderDialog").close();
        that.showMessageToast(that.getText("msgOrderUpdatedSuccess", [sVbeln]));
        that.loadOrderDetail(sVbeln);
      })
      .catch(function (err) {
        that.showErrorMessage("Update failed: " + (err.message || err));
      })
      .finally(function () {
        that.getModel("appView").setProperty("/busy", false);
      });
    },

    onCancelEditOrder: function () {
      this.byId("editOrderDialog").close();
    },

    onPrintOrder: function () {
      window.print();
    }
  });
});
