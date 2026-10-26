sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "sap/fiori/salesorder/model/models",
  "sap/fiori/salesorder/service/OrderService"
], function (UIComponent, Device, models, OrderService) {
  "use strict";

  return UIComponent.extend("sap.fiori.salesorder.Component", {
    metadata: {
      manifest: "json"
    },

    /**
     * The component is initialized by UI5 automatically during the startup of the app.
     * @override
     */
    init: function () {
      // Call the base component's init function
      UIComponent.prototype.init.apply(this, arguments);

      // Set the device model
      this.setModel(models.createDeviceModel(), "device");

      // Set the global app view state model
      this.setModel(models.createAppViewModel(), "appView");

      // Initialize the Order Service layer
      this._orderService = new OrderService(this);

      // Create the views based on the url/hash
      this.getRouter().initialize();
    },

    /**
     * Returns the singleton OrderService instance
     * @returns {sap.fiori.salesorder.service.OrderService} OrderService instance
     */
    getOrderService: function () {
      return this._orderService;
    },

    /**
     * Helper to determine content density class (compact for desktop, cozy for mobile touch)
     * @returns {string} CSS class name
     */
    getContentDensityClass: function () {
      if (!this._sContentDensityClass) {
        if (!Device.support.touch) {
          this._sContentDensityClass = "sapUiSizeCompact";
        } else {
          this._sContentDensityClass = "sapUiSizeCozy";
        }
      }
      return this._sContentDensityClass;
    }
  });
});
