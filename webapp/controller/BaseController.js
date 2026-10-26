sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/routing/History",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, History, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("sap.fiori.salesorder.controller.BaseController", {
    /**
     * Convenience method for accessing the router in every controller.
     * @returns {sap.ui.core.routing.Router} the router for this component
     */
    getRouter: function () {
      return this.getOwnerComponent().getRouter();
    },

    /**
     * Convenience method for getting the view model by name in every controller.
     * @param {string} [sName] the model name
     * @returns {sap.ui.model.Model} the model instance
     */
    getModel: function (sName) {
      return this.getView().getModel(sName) || this.getOwnerComponent().getModel(sName);
    },

    /**
     * Convenience method for setting the view model in every controller.
     * @param {sap.ui.model.Model} oModel the model instance
     * @param {string} [sName] the model name
     * @returns {sap.ui.core.mvc.Controller} the controller instance
     */
    setModel: function (oModel, sName) {
      return this.getView().setModel(oModel, sName);
    },

    /**
     * Convenience method for getting the resource bundle.
     * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
     */
    getResourceBundle: function () {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle();
    },

    /**
     * Convenience method to retrieve translated text from i18n
     * @param {string} sKey i18n key
     * @param {Array} [aArgs] placeholder parameters
     * @returns {string} translated text
     */
    getText: function (sKey, aArgs) {
      return this.getResourceBundle().getText(sKey, aArgs);
    },

    /**
     * Convenience method to retrieve the OrderService instance
     * @returns {sap.fiori.salesorder.service.OrderService} OrderService instance
     */
    getOrderService: function () {
      return this.getOwnerComponent().getOrderService();
    },

    /**
     * Event handler for navigating back.
     * Checks history to decide between browser history or default route.
     * @param {string} [sDefaultRoute] Fallback route name
     */
    onNavBack: function (sDefaultRoute) {
      var sPreviousHash = History.getInstance().getPreviousHash();

      if (sPreviousHash !== undefined) {
        window.history.go(-1);
      } else {
        this.getRouter().navTo(sDefaultRoute || "dashboard", {}, true);
      }
    },

    /**
     * Helper to show MessageToast
     * @param {string} sMessage Message text
     */
    showMessageToast: function (sMessage) {
      MessageToast.show(sMessage, {
        duration: 3500,
        closeOnBrowserNavigation: false
      });
    },

    /**
     * Helper to show MessageBox error
     * @param {string} sMessage Error text
     * @param {string} [sTitle] Optional title
     */
    showErrorMessage: function (sMessage, sTitle) {
      MessageBox.error(sMessage, {
        title: sTitle || this.getText("appTitle")
      });
    },

    /**
     * Helper to show MessageBox success
     * @param {string} sMessage Success text
     * @param {string} [sTitle] Optional title
     * @param {function} [fnOnClose] Optional callback
     */
    showSuccessMessage: function (sMessage, sTitle, fnOnClose) {
      MessageBox.success(sMessage, {
        title: sTitle || this.getText("appTitle"),
        onClose: fnOnClose
      });
    }
  });
});
