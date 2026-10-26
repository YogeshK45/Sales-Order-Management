sap.ui.define([
  "sap/ui/core/format/NumberFormat",
  "sap/ui/core/format/DateFormat"
], function (NumberFormat, DateFormat) {
  "use strict";

  return {
    /**
     * Maps order status code to sap.ui.core.ValueState
     * @param {string} sStatus Status code ('O', 'C', 'X')
     * @returns {string} ValueState
     */
    statusState: function (sStatus) {
      if (!sStatus) {
        return "None";
      }
      switch (sStatus.toUpperCase()) {
        case "C":
        case "CONFIRMED":
          return "Success";
        case "O":
        case "OPEN":
          return "Warning";
        case "X":
        case "CANCELLED":
          return "Error";
        default:
          return "Information";
      }
    },

    /**
     * Maps order status code to an appropriate SAP-icon
     * @param {string} sStatus Status code ('O', 'C', 'X')
     * @returns {string} Icon URI
     */
    statusIcon: function (sStatus) {
      if (!sStatus) {
        return "sap-icon://question-mark";
      }
      switch (sStatus.toUpperCase()) {
        case "C":
        case "CONFIRMED":
          return "sap-icon://sys-enter-2";
        case "O":
        case "OPEN":
          return "sap-icon://pending";
        case "X":
        case "CANCELLED":
          return "sap-icon://sys-cancel";
        default:
          return "sap-icon://status-in-process";
      }
    },

    /**
     * Returns human-readable status text
     * @param {string} sStatus Status code
     * @returns {string} Description
     */
    statusText: function (sStatus) {
      if (!sStatus) {
        return "Unknown";
      }
      switch (sStatus.toUpperCase()) {
        case "C":
        case "CONFIRMED":
          return "Confirmed";
        case "O":
        case "OPEN":
          return "Open";
        case "X":
        case "CANCELLED":
          return "Cancelled";
        default:
          return sStatus;
      }
    },

    /**
     * Formats currency amounts
     * @param {number|string} fValue Amount
     * @param {string} sCurrency Currency code (EUR, USD, etc.)
     * @returns {string} Formatted currency string
     */
    currency: function (fValue, sCurrency) {
      if (fValue === undefined || fValue === null || fValue === "") {
        return "0.00 " + (sCurrency || "EUR");
      }
      var num = parseFloat(fValue);
      if (isNaN(num)) {
        return "0.00 " + (sCurrency || "EUR");
      }
      var oCurrencyFormat = NumberFormat.getCurrencyInstance({
        currencyCode: false,
        minFractionDigits: 2,
        maxFractionDigits: 2
      });
      return oCurrencyFormat.format(num) + " " + (sCurrency || "EUR");
    },

    /**
     * Formats dates to standard SAP display format
     * @param {string|Date} oDate Date input
     * @returns {string} Formatted date
     */
    formatDate: function (oDate) {
      if (!oDate) {
        return "";
      }
      var d = oDate instanceof Date ? oDate : new Date(oDate);
      if (isNaN(d.getTime())) {
        return String(oDate);
      }
      var oDateFormat = DateFormat.getDateInstance({
        pattern: "dd-MMM-yyyy"
      });
      return oDateFormat.format(d);
    },

    /**
     * Formats line item numbers to standard 6-digit NUMC format (e.g. 000010)
     * @param {string|number} vPosnr Item number
     * @returns {string} Formatted NUMC posnr
     */
    itemNumber: function (vPosnr) {
      if (!vPosnr) {
        return "000010";
      }
      var sStr = String(vPosnr).replace(/^0+/, "");
      while (sStr.length < 6) {
        sStr = "0" + sStr;
      }
      return sStr;
    },

    /**
     * Formats quantity with unit of measure
     * @param {number|string} fQty Quantity
     * @param {string} sUnit Unit of measure
     * @returns {string} Formatted quantity
     */
    quantity: function (fQty, sUnit) {
      if (fQty === undefined || fQty === null || fQty === "") {
        return "0 " + (sUnit || "EA");
      }
      var num = parseFloat(fQty);
      if (isNaN(num)) {
        return "0 " + (sUnit || "EA");
      }
      var oNumberFormat = NumberFormat.getFloatInstance({
        minFractionDigits: 0,
        maxFractionDigits: 3
      });
      return oNumberFormat.format(num) + " " + (sUnit || "EA");
    }
  };
});
