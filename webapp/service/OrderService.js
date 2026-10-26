sap.ui.define([
  "sap/ui/base/Object"
], function (BaseObject) {
  "use strict";

  var STORAGE_KEY_HEADERS = "SAP_ZSO_HDR_STORE";
  var STORAGE_KEY_ITEMS = "SAP_ZSO_ITEM_STORE";

  var OrderService = BaseObject.extend("sap.fiori.salesorder.service.OrderService", {
    /**
     * Constructor
     * @param {sap.ui.core.Component} oComponent Component reference
     */
    constructor: function (oComponent) {
      BaseObject.apply(this, arguments);
      this._oComponent = oComponent;
      this._bUseLiveOData = false;
      this._sGatewayUrl = "/sap/opu/odata/sap/ZSALES_ORDER_SRV/";
      this._initLocalStore();
    },

    /**
     * Initializes mock local storage with predefined dataset if empty
     * @private
     */
    _initLocalStore: function () {
      if (!localStorage.getItem(STORAGE_KEY_HEADERS)) {
        this.resetToDefaults();
      }
    },

    /**
     * Resets local storage to initial mock files
     * @returns {Promise} Resolves when reset completes
     */
    resetToDefaults: function () {
      var that = this;
      return Promise.all([
        that._fetchJson("localService/mockdata/SalesOrderHeaders.json"),
        that._fetchJson("localService/mockdata/SalesOrderItems.json"),
        that._fetchJson("localService/mockdata/Customers.json"),
        that._fetchJson("localService/mockdata/Materials.json")
      ]).then(function (aResults) {
        localStorage.setItem(STORAGE_KEY_HEADERS, JSON.stringify(aResults[0]));
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(aResults[1]));
        that._aCustomers = aResults[2];
        that._aMaterials = aResults[3];
        return true;
      });
    },

    /**
     * Internal helper to fetch JSON
     * @private
     */
    _fetchJson: function (sPath) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", sPath, true);
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (e) {
              resolve([]);
            }
          } else {
            resolve([]);
          }
        };
        xhr.onerror = function () {
          resolve([]);
        };
        xhr.send();
      });
    },

    _getHeadersFromStorage: function () {
      try {
        var data = localStorage.getItem(STORAGE_KEY_HEADERS);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    },

    _saveHeadersToStorage: function (aHeaders) {
      localStorage.setItem(STORAGE_KEY_HEADERS, JSON.stringify(aHeaders));
    },

    _getItemsFromStorage: function () {
      try {
        var data = localStorage.getItem(STORAGE_KEY_ITEMS);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    },

    _saveItemsToStorage: function (aItems) {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(aItems));
    },

    /**
     * Fetch list of Sales Orders (Headers)
     * @param {object} [mParams] Optional query parameters (search, status)
     * @returns {Promise<Array>} List of headers
     */
    getSalesOrders: function (mParams) {
      var that = this;
      return new Promise(function (resolve) {
        setTimeout(function () {
          var aHeaders = that._getHeadersFromStorage();
          var aFiltered = aHeaders.slice();

          if (mParams) {
            if (mParams.status && mParams.status !== "ALL") {
              aFiltered = aFiltered.filter(function (oHdr) {
                return oHdr.Status === mParams.status;
              });
            }

            if (mParams.search) {
              var sSearch = mParams.search.toLowerCase().trim();
              aFiltered = aFiltered.filter(function (oHdr) {
                return (oHdr.Vbeln && oHdr.Vbeln.toLowerCase().indexOf(sSearch) !== -1) ||
                       (oHdr.Kunnr && oHdr.Kunnr.toLowerCase().indexOf(sSearch) !== -1) ||
                       (oHdr.CustomerName && oHdr.CustomerName.toLowerCase().indexOf(sSearch) !== -1);
              });
            }
          }

          // Sort descending by Vbeln
          aFiltered.sort(function (a, b) {
            return String(b.Vbeln).localeCompare(String(a.Vbeln));
          });

          resolve(aFiltered);
        }, 120);
      });
    },

    /**
     * Fetch single Sales Order by ID with Line Items
     * @param {string} sVbeln Sales Order ID
     * @returns {Promise<object>} Sales order object with header and items
     */
    getSalesOrder: function (sVbeln) {
      var that = this;
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          var aHeaders = that._getHeadersFromStorage();
          var aItems = that._getItemsFromStorage();

          var oHeader = aHeaders.find(function (h) {
            return String(h.Vbeln) === String(sVbeln);
          });

          if (!oHeader) {
            reject(new Error("Sales Order " + sVbeln + " not found"));
            return;
          }

          var aOrderItems = aItems.filter(function (i) {
            return String(i.Vbeln) === String(sVbeln);
          });

          // Deep clone
          var oResult = JSON.parse(JSON.stringify(oHeader));
          oResult.Items = JSON.parse(JSON.stringify(aOrderItems));

          // Also attach Customer details if available
          that.getCustomers().then(function (aCusts) {
            var oCust = aCusts.find(function (c) {
              return c.Kunnr === oHeader.Kunnr;
            });
            oResult.Customer = oCust || {
              Kunnr: oHeader.Kunnr,
              Name1: oHeader.CustomerName,
              City: "Not Specified",
              Country: "DE",
              Telephone: "+49 000 000000",
              Email: "contact@customer.com"
            };
            resolve(oResult);
          });
        }, 100);
      });
    },

    /**
     * Create Sales Order (Deep Insert equivalent to Gateway CREATE_DEEP_ENTITY)
     * @param {object} oPayload Deep payload with Header + Items array
     * @returns {Promise<object>} Created order
     */
    createSalesOrder: function (oPayload) {
      var that = this;
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          try {
            if (!oPayload || !oPayload.Kunnr) {
              throw new Error("Customer ID is mandatory.");
            }
            if (!oPayload.Items || oPayload.Items.length === 0) {
              throw new Error("At least one line item is required.");
            }

            var aHeaders = that._getHeadersFromStorage();
            var aItems = that._getItemsFromStorage();

            // Determine Vbeln (sales order number generation)
            var sVbeln = oPayload.Vbeln;
            if (!sVbeln || sVbeln.trim() === "") {
              // Find max existing Vbeln
              var iMax = 1000;
              aHeaders.forEach(function (h) {
                var num = parseInt(h.Vbeln, 10);
                if (!isNaN(num) && num > iMax) {
                  iMax = num;
                }
              });
              var nextNum = iMax + 1;
              sVbeln = String(nextNum);
              while (sVbeln.length < 10) {
                sVbeln = "0" + sVbeln;
              }
            } else {
              // Pad to 10 digits if numeric
              if (/^\d+$/.test(sVbeln)) {
                while (sVbeln.length < 10) {
                  sVbeln = "0" + sVbeln;
                }
              }
              // Check uniqueness
              var bExists = aHeaders.some(function (h) {
                return h.Vbeln === sVbeln;
              });
              if (bExists) {
                throw new Error("Sales Order ID " + sVbeln + " already exists in ZSO_HDR.");
              }
            }

            // Calculate item amounts & order total
            var fOrderTotal = 0;
            var aNewItems = [];

            oPayload.Items.forEach(function (item, index) {
              var sPosnr = item.Posnr;
              if (!sPosnr) {
                var iPos = (index + 1) * 10;
                sPosnr = String(iPos);
                while (sPosnr.length < 6) {
                  sPosnr = "0" + sPosnr;
                }
              }

              var fQty = parseFloat(item.Qty) || 0;
              var fPrice = parseFloat(item.UnitPrice) || 0;
              var fNet = Math.round(fQty * fPrice * 100) / 100;
              fOrderTotal += fNet;

              var oNewItem = {
                Vbeln: sVbeln,
                Posnr: sPosnr,
                Matnr: item.Matnr || "",
                Maktx: item.Maktx || "Item " + sPosnr,
                Qty: fQty,
                Meins: item.Meins || "EA",
                UnitPrice: fPrice,
                NetAmount: fNet,
                Waers: item.Waers || oPayload.Currency || "EUR"
              };
              aNewItems.push(oNewItem);
            });

            // Map Status description
            var sStatus = oPayload.Status || "O";
            var sStatusText = "Open";
            if (sStatus === "C") {
              sStatusText = "Confirmed";
            } else if (sStatus === "X") {
              sStatusText = "Cancelled";
            }

            var oNewHeader = {
              Vbeln: sVbeln,
              Kunnr: oPayload.Kunnr,
              CustomerName: oPayload.CustomerName || "Customer " + oPayload.Kunnr,
              Erdat: oPayload.Erdat || new Date().toISOString().split("T")[0],
              Status: sStatus,
              StatusText: sStatusText,
              Currency: oPayload.Currency || "EUR",
              TotalAmount: Math.round(fOrderTotal * 100) / 100,
              ItemCount: aNewItems.length,
              Remarks: oPayload.Remarks || ""
            };

            // Save to memory/localStorage
            aHeaders.unshift(oNewHeader);
            aItems = aItems.concat(aNewItems);

            that._saveHeadersToStorage(aHeaders);
            that._saveItemsToStorage(aItems);

            var oResult = JSON.parse(JSON.stringify(oNewHeader));
            oResult.Items = aNewItems;
            resolve(oResult);
          } catch (err) {
            reject(err);
          }
        }, 150);
      });
    },

    /**
     * Update Sales Order
     * @param {string} sVbeln Order ID
     * @param {object} oUpdateData Fields to update (Status, Remarks, Items, etc.)
     * @returns {Promise<object>} Updated order
     */
    updateSalesOrder: function (sVbeln, oUpdateData) {
      var that = this;
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          var aHeaders = that._getHeadersFromStorage();
          var iIndex = aHeaders.findIndex(function (h) {
            return String(h.Vbeln) === String(sVbeln);
          });

          if (iIndex === -1) {
            reject(new Error("Sales Order " + sVbeln + " not found"));
            return;
          }

          var oTarget = aHeaders[iIndex];

          if (oUpdateData.Status) {
            oTarget.Status = oUpdateData.Status;
            if (oTarget.Status === "C") {
              oTarget.StatusText = "Confirmed";
            } else if (oTarget.Status === "X") {
              oTarget.StatusText = "Cancelled";
            } else {
              oTarget.StatusText = "Open";
            }
          }

          if (oUpdateData.Remarks !== undefined) {
            oTarget.Remarks = oUpdateData.Remarks;
          }

          if (oUpdateData.CustomerName) {
            oTarget.CustomerName = oUpdateData.CustomerName;
          }

          // If updating items
          if (oUpdateData.Items) {
            var aAllItems = that._getItemsFromStorage();
            // Remove existing items for this order
            aAllItems = aAllItems.filter(function (i) {
              return String(i.Vbeln) !== String(sVbeln);
            });

            var fNewTotal = 0;
            oUpdateData.Items.forEach(function (item, index) {
              var sPosnr = item.Posnr;
              if (!sPosnr) {
                var iPos = (index + 1) * 10;
                sPosnr = String(iPos);
                while (sPosnr.length < 6) {
                  sPosnr = "0" + sPosnr;
                }
              }
              var fQty = parseFloat(item.Qty) || 0;
              var fPrice = parseFloat(item.UnitPrice) || 0;
              var fNet = Math.round(fQty * fPrice * 100) / 100;
              fNewTotal += fNet;

              aAllItems.push({
                Vbeln: sVbeln,
                Posnr: sPosnr,
                Matnr: item.Matnr,
                Maktx: item.Maktx,
                Qty: fQty,
                Meins: item.Meins || "EA",
                UnitPrice: fPrice,
                NetAmount: fNet,
                Waers: item.Waers || oTarget.Currency || "EUR"
              });
            });

            oTarget.TotalAmount = Math.round(fNewTotal * 100) / 100;
            oTarget.ItemCount = oUpdateData.Items.length;
            that._saveItemsToStorage(aAllItems);
          }

          aHeaders[iIndex] = oTarget;
          that._saveHeadersToStorage(aHeaders);

          resolve(oTarget);
        }, 120);
      });
    },

    /**
     * Delete Sales Order (Transactional delete from ZSO_HDR & ZSO_ITEM)
     * @param {string} sVbeln Sales Order ID
     * @returns {Promise<boolean>} Success indicator
     */
    deleteSalesOrder: function (sVbeln) {
      var that = this;
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          var aHeaders = that._getHeadersFromStorage();
          var aItems = that._getItemsFromStorage();

          var iHdrIndex = aHeaders.findIndex(function (h) {
            return String(h.Vbeln) === String(sVbeln);
          });

          if (iHdrIndex === -1) {
            reject(new Error("Sales Order " + sVbeln + " not found"));
            return;
          }

          // Remove header
          aHeaders.splice(iHdrIndex, 1);
          that._saveHeadersToStorage(aHeaders);

          // Remove line items
          var aRemainingItems = aItems.filter(function (i) {
            return String(i.Vbeln) !== String(sVbeln);
          });
          that._saveItemsToStorage(aRemainingItems);

          resolve(true);
        }, 100);
      });
    },

    /**
     * Fetch Customer master records for Value Help
     * @param {string} [sQuery] Optional filter term
     * @returns {Promise<Array>} List of customers
     */
    getCustomers: function (sQuery) {
      var that = this;
      return new Promise(function (resolve) {
        if (that._aCustomers && that._aCustomers.length > 0) {
          resolve(that._filterCustomers(that._aCustomers, sQuery));
        } else {
          that._fetchJson("localService/mockdata/Customers.json").then(function (data) {
            that._aCustomers = data;
            resolve(that._filterCustomers(data, sQuery));
          });
        }
      });
    },

    _filterCustomers: function (aList, sQuery) {
      if (!sQuery || sQuery.trim() === "") {
        return aList;
      }
      var sQ = sQuery.toLowerCase().trim();
      return aList.filter(function (c) {
        return (c.Kunnr && c.Kunnr.toLowerCase().indexOf(sQ) !== -1) ||
               (c.Name1 && c.Name1.toLowerCase().indexOf(sQ) !== -1) ||
               (c.City && c.City.toLowerCase().indexOf(sQ) !== -1);
      });
    },

    /**
     * Fetch Material master records for Value Help
     * @param {string} [sQuery] Optional filter term
     * @returns {Promise<Array>} List of materials
     */
    getMaterials: function (sQuery) {
      var that = this;
      return new Promise(function (resolve) {
        if (that._aMaterials && that._aMaterials.length > 0) {
          resolve(that._filterMaterials(that._aMaterials, sQuery));
        } else {
          that._fetchJson("localService/mockdata/Materials.json").then(function (data) {
            that._aMaterials = data;
            resolve(that._filterMaterials(data, sQuery));
          });
        }
      });
    },

    _filterMaterials: function (aList, sQuery) {
      if (!sQuery || sQuery.trim() === "") {
        return aList;
      }
      var sQ = sQuery.toLowerCase().trim();
      return aList.filter(function (m) {
        return (m.Matnr && m.Matnr.toLowerCase().indexOf(sQ) !== -1) ||
               (m.Maktx && m.Maktx.toLowerCase().indexOf(sQ) !== -1) ||
               (m.Matkl && m.Matkl.toLowerCase().indexOf(sQ) !== -1);
      });
    },

    /**
     * Compute Executive KPIs for Dashboard
     * @returns {Promise<object>} Dashboard metrics
     */
    getDashboardKPIs: function () {
      var that = this;
      return this.getSalesOrders().then(function (aHeaders) {
        var iTotal = aHeaders.length;
        var iOpen = 0;
        var iConfirmed = 0;
        var iCancelled = 0;
        var fTotalValue = 0;

        aHeaders.forEach(function (h) {
          var val = parseFloat(h.TotalAmount) || 0;
          fTotalValue += val;
          if (h.Status === "O" || h.Status === "OPEN") {
            iOpen++;
          } else if (h.Status === "C" || h.Status === "CONFIRMED") {
            iConfirmed++;
          } else if (h.Status === "X" || h.Status === "CANCELLED") {
            iCancelled++;
          }
        });

        var fAvgValue = iTotal > 0 ? (fTotalValue / iTotal) : 0;
        var aRecent = aHeaders.slice(0, 5);

        return {
          totalOrders: iTotal,
          openOrders: iOpen,
          confirmedOrders: iConfirmed,
          cancelledOrders: iCancelled,
          totalValue: Math.round(fTotalValue * 100) / 100,
          avgValue: Math.round(fAvgValue * 100) / 100,
          currency: "EUR",
          recentOrders: aRecent
        };
      });
    }
  });

  return OrderService;
});
