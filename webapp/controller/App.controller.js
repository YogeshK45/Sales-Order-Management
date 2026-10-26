sap.ui.define([
  "sap/fiori/salesorder/controller/BaseController",
  "sap/m/MessageBox"
], function (BaseController, MessageBox) {
  "use strict";

  return BaseController.extend("sap.fiori.salesorder.controller.App", {
    onInit: function () {
      // Apply compact density class
      this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
    },

    onNavToDashboard: function () {
      this.getRouter().navTo("dashboard");
    },

    onNavToOrders: function () {
      this.getRouter().navTo("orderList");
    },

    onNavToCreate: function () {
      this.getRouter().navTo("createOrder");
    },

    onResetDemoData: function () {
      var that = this;
      MessageBox.confirm("Are you sure you want to reset the mock database store (ZSO_HDR and ZSO_ITEM) to initial demo records?", {
        title: "Reset Mock Data",
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.OK) {
            that.getOrderService().resetToDefaults().then(function () {
              that.showMessageToast("Database store restored to initial seed state.");
              // Reload active view
              that.getRouter().navTo("dashboard", {}, true);
              window.location.reload();
            });
          }
        }
      });
    }
  });
});
