sap.ui.define([
  "sap/fiori/salesorder/controller/BaseController",
  "sap/ui/model/json/JSONModel",
  "sap/fiori/salesorder/model/formatter",
  "sap/m/MessageBox",
  "sap/ui/model/Sorter"
], function (BaseController, JSONModel, formatter, MessageBox, Sorter) {
  "use strict";

  return BaseController.extend("sap.fiori.salesorder.controller.OrderList", {
    formatter: formatter,

    onInit: function () {
      var oOrdersModel = new JSONModel({
        list: [],
        sortAscending: false
      });
      this.setModel(oOrdersModel, "orders");

      this.getRouter().getRoute("orderList").attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function () {
      this.loadOrders();
    },

    /**
     * Loads orders applying current search query and status filter
     */
    loadOrders: function () {
      var that = this;
      var oSearchField = this.byId("searchOrderField");
      var oStatusSelect = this.byId("selectStatusFilter");

      var sSearch = oSearchField ? oSearchField.getValue() : "";
      var sStatus = oStatusSelect ? oStatusSelect.getSelectedKey() : "ALL";

      this.getModel("appView").setProperty("/busy", true);

      this.getOrderService().getSalesOrders({
        search: sSearch,
        status: sStatus
      })
      .then(function (aList) {
        that.getModel("orders").setProperty("/list", aList);
      })
      .catch(function (err) {
        that.showErrorMessage("Error loading sales orders: " + (err.message || err));
      })
      .finally(function () {
        that.getModel("appView").setProperty("/busy", false);
      });
    },

    onRefresh: function () {
      this.loadOrders();
      this.showMessageToast("Sales orders refreshed from backend store");
    },

    onSearchOrders: function (oEvent) {
      this.loadOrders();
    },

    onLiveSearch: function (oEvent) {
      // Debounced live search
      var that = this;
      if (this._iSearchTimeout) {
        clearTimeout(this._iSearchTimeout);
      }
      this._iSearchTimeout = setTimeout(function () {
        that.loadOrders();
      }, 300);
    },

    onStatusFilterChange: function () {
      this.loadOrders();
    },

    onNavToCreate: function () {
      this.getRouter().navTo("createOrder");
    },

    onOrderRowPress: function (oEvent) {
      var oItem = oEvent.getSource();
      var oCtx = oItem.getBindingContext("orders");
      if (oCtx) {
        var sVbeln = oCtx.getProperty("Vbeln");
        this.getRouter().navTo("orderDetail", {
          vbeln: sVbeln
        });
      }
    },

    onViewOrder: function (oEvent) {
      oEvent.cancelBubble();
      var oBtn = oEvent.getSource();
      var oCtx = oBtn.getBindingContext("orders");
      if (oCtx) {
        var sVbeln = oCtx.getProperty("Vbeln");
        this.getRouter().navTo("orderDetail", {
          vbeln: sVbeln
        });
      }
    },

    onDeleteOrder: function (oEvent) {
      oEvent.cancelBubble();
      var that = this;
      var oBtn = oEvent.getSource();
      var oCtx = oBtn.getBindingContext("orders");
      if (!oCtx) {
        return;
      }

      var sVbeln = oCtx.getProperty("Vbeln");

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
                that.loadOrders();
              })
              .catch(function (err) {
                that.showErrorMessage("Failed to delete order: " + (err.message || err));
              })
              .finally(function () {
                that.getModel("appView").setProperty("/busy", false);
              });
          }
        }
      });
    },

    onOpenSortDialog: function () {
      var oTable = this.byId("tblOrders");
      var oBinding = oTable.getBinding("items");
      var oOrdersModel = this.getModel("orders");
      var bAsc = !oOrdersModel.getProperty("/sortAscending");
      oOrdersModel.setProperty("/sortAscending", bAsc);

      var oSorter = new Sorter("Vbeln", !bAsc);
      oBinding.sort(oSorter);

      this.showMessageToast("Sorted by Order ID " + (bAsc ? "Ascending" : "Descending"));
    },

    onExportOrders: function () {
      var aList = this.getModel("orders").getProperty("/list") || [];
      if (aList.length === 0) {
        this.showMessageToast("No data to export");
        return;
      }

      var sCsv = "Sales Order ID,Customer ID,Customer Name,Order Date,Status,Item Count,Total Amount,Currency\n";
      aList.forEach(function (h) {
        sCsv += '"' + (h.Vbeln || "") + '",';
        sCsv += '"' + (h.Kunnr || "") + '",';
        sCsv += '"' + (h.CustomerName || "").replace(/"/g, '""') + '",';
        sCsv += '"' + (h.Erdat || "") + '",';
        sCsv += '"' + (h.StatusText || h.Status || "") + '",';
        sCsv += (h.ItemCount || 0) + ",";
        sCsv += (h.TotalAmount || 0) + ",";
        sCsv += '"' + (h.Currency || "EUR") + '"\n';
      });

      var blob = new Blob([sCsv], { type: "text/csv;charset=utf-8;" });
      var link = document.createElement("a");
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "Sales_Orders_" + new Date().toISOString().slice(0, 10) + ".csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showMessageToast("Sales orders exported to CSV file");
    }
  });
});
