sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/ui/Device"
], function (JSONModel, Device) {
  "use strict";

  return {
    /**
     * Initializes the device model for responsive UI adjustments
     * @returns {sap.ui.model.json.JSONModel} Device model
     */
    createDeviceModel: function () {
      var oModel = new JSONModel(Device);
      oModel.setDefaultBindingMode("OneWay");
      return oModel;
    },

    /**
     * Initializes the global app view state model (loading indicators, active route, layout)
     * @returns {sap.ui.model.json.JSONModel} App view model
     */
    createAppViewModel: function () {
      return new JSONModel({
        busy: false,
        delay: 0,
        currency: "EUR",
        isLiveGateway: false,
        activeTab: "dashboard",
        unreadNotifications: 2
      });
    }
  };
});
