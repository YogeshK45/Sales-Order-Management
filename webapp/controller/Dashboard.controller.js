sap.ui.define([
  "sap/fiori/salesorder/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/fiori/salesorder/model/formatter"
], function (BaseController, JSONModel, formatter) {
  "use strict";

  return BaseController.extend("sap.fiori.salesorder.controller.Dashboard", {
    formatter: formatter,

    onInit: function () {
      var oDashboardModel = new JSONModel();
      this.setModel(oDashboardModel, "dashboard");

      this.getRouter().getRoute("dashboard").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function () {
      this.loadDashboardData();
    },

    /**
     * Loads metrics and recent orders from OrderService
     */
    loadDashboardData: function () {
      var that = this;
      var oDashboardModel = this.getModel("dashboard");
      this.getModel("appView").setProperty("/busy", true);

      this.getOrderService().getDashboardKPIs()
        .then(function (oData) {
          oDashboardModel.setData(oData);
        })
        .catch(function (oError) {
          that.showErrorMessage("Failed to load dashboard metrics: " + (oError.message || oError));
        })
        .finally(function () {
          that.getModel("appView").setProperty("/busy", false);
        });
    },

    onRefresh: function () {
      this.loadDashboardData();
      this.showMessageToast("Dashboard KPIs updated");
    },

    onNavToCreate: function () {
      this.getRouter().navTo("createOrder");
    },

    onNavToOrders: function () {
      this.getRouter().navTo("orderList");
    },

    onOrderPress: function (oEvent) {
      var oItem = oEvent.getSource();
      var oCtx = oItem.getBindingContext("dashboard");
      if (oCtx) {
        var sVbeln = oCtx.getProperty("Vbeln");
        this.getRouter().navTo("orderDetail", {
          vbeln: sVbeln
        });
      }
    },

    onViewOrderPress: function (oEvent) {
      // Prevent bubbling to row press
      oEvent.cancelBubble();
      var oBtn = oEvent.getSource();
      var oCtx = oBtn.getBindingContext("dashboard");
      if (oCtx) {
        var sVbeln = oCtx.getProperty("Vbeln");
        this.getRouter().navTo("orderDetail", {
          vbeln: sVbeln
        });
      }
    }
  });
});
