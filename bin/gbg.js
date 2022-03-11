const knex = require("./connection");
const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1')
const { bopisProcessingTime } = require("./queryFunctions/bopisProcessingTime");
const { cancellations, storeVendorDCCancel, allCancelRates, cancelToStoreOrVendor, bopisLineShorts, bopisLineCancels } = require("./queryFunctions/cancellations");
const { currentOpenCriticalTickets, criticalTicketsCreated } = require("./requestFunctions/criticalTickets")
const { backorderedSuccessful, stuckInAllocated, timeToRelease } = require("./queryFunctions/allocatedReleased")
const { failRate } = require("./queryFunctions/payment");
const { fillRate, storeFirstFillRates, uniqueStoreFillRate } = require("./queryFunctions/fulfillment");
const { returnRate, blindReturns } = require("./queryFunctions/returns")
const { openRates, backorderRates, returnToShelf, stalePickStatus } = require("./queryFunctions/orderAging")
const { storeBounceRate, tenBounce, uniqueTenBounce, uniqueVendorFillRate, vendorBounceRate, vendorTenBounce } = require("./queryFunctions/bounceReport")
const oper = {
    "<": function(a, b) {return a < b},
    ">": function(a, b) {return a > b},
    "<=": function(a, b) {return a <= b},
    ">=": function(a, b) {return a >= b},
    "===": function(a, b) {return a === b}
}

async function buildReport() {
    let oneDayTotal = 0
    let twoDayTotal = 0
    let totalOrders = 0
    let letters = ["A", "B", "C", "D", "E", "F", "G", "H"]
    try {
        let rows = []
        let row = ["Information Source", "Category", "Metric", "SLA", "Target", "Actual", "Results", "Comment"]
        let src, cat, met, sla, tar, act, res, ind, typ
        rows.push(row)
        console.log("-----")
        const bpt1 = await bopisProcessingTime(1)
        console.log(`1 Day Average N97 Order Processing Time: ${bpt1} minutes`)
        src = "BOPIS"
        cat = "Processing"
        met = "N[97] time to take BOPIS to get to store"
        sla = 15
        tar = 10
        act = bpt1
        ind = "<="
        typ = "minutes"
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = [src, cat, met, `${sla + typ}`, `${tar + typ}`, `${act + typ}`, res,  ""]
        rows.push(row)
        const bpt7 = await bopisProcessingTime(7)
        console.log(`7 Day Average N97 Order Processing Time: ${bpt7} minutes`)
        oper[ind](bpt7, tar) ? res = "Exceeds SLA" : oper[ind](bpt7, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["BOPIS Orders Store 1d", "Processing", "N[97] time to take BOPIS to get to store", `${sla + typ}`, `${tar + typ}`, `${bpt7 + typ}`, res,  ""]
        rows.push(row)
        // const can1 = await cancellations(1)
        // console.log(`1 Day Cancel Rate: ${can1}%`)
        // const can7 = await cancellations(7)
        // console.log(`7 Day Cancel Rate: ${can7}%`)
        // const svdc1 = await storeVendorDCCancel(1)
        // console.log(`1 Day Store, Vendor and DC Cancels: ${svdc1}%`)
        // const coct = await currentOpenCriticalTickets()
        // console.log(`Current Unresolved Critical Issues: ${coct}`)
        // const ctc = await criticalTicketsCreated()
        // console.log(`1 Day Critical Tickets Created: ${ctc}`)
        // //add orderImport functions
        // const bs = await backorderedSuccessful()
        // console.log(`Current Backorder Rate: ${bs.BACKORDERED}%`)
        // console.log(`Current Success Rate: ${bs.SUCCESSFUL}%`)
        // const sia = await stuckInAllocated()
        // console.log(`Orders Stuck in Allocated, Not On Hold: ${sia}`)
        // const ttr = await timeToRelease() 
        // console.log(`Average N97 Time to Release for ITS: ${ttr.ITS} minutes`)
        // console.log(`Average N97 Time to Release for LEA: ${ttr.LEA} minutes`)
        // console.log(`Average N97 Time to Release for LPS: ${ttr.LPS} minutes`)
        // console.log(`Average N97 Time to Release for MP: ${ttr.MP} minutes`)
        // console.log(`Average N97 Time to Release for PRO: ${ttr.PRO} minutes`)
        // console.log(`Average N97 Time to Release for PSW: ${ttr.PSW} minutes`)
        // const odfill = await fillRate(1)
        // odfill.forEach((line) => console.log(`1 Day Fill Rate for ${line.FULFILLMENT_TYPE}: ${line.FILL_RATE}%`))
        // const owfill = await fillRate(7)
        // owfill.forEach((line) => console.log(`7 Day Fill Rate for ${line.FULFILLMENT_TYPE}: ${line.FILL_RATE}%`))
        // const sufrod = await uniqueStoreFillRate(1)
        // console.log(`1 Day Store Unique Fill Rate: ${sufrod}%`)
        // const sufrow = await uniqueStoreFillRate(7)
        // console.log(`7 Day Store Unique Fill Rate: ${sufrow}%`)
        // const sfod = await storeFirstFillRates(1)
        // console.log(`1 Day Store First Fill Rate: ${sfod}%`)
        // const sfow = await storeFirstFillRates(7)
        // console.log(`7 Day Store First Fill Rate: ${sfow}%`)
        // const odfr = await failRate(1)
        // console.log(`1 Day Max Payment Failure Rate: ${odfr.CARD_TYPE}, ${odfr.FAILURE_RATE}%`)
        // const owfr = await failRate(7)
        // console.log(`7 Day Max Payment Failure Rate: ${owfr.CARD_TYPE}, ${owfr.FAILURE_RATE}%`)
        // const tdfr = await failRate(30)
        // console.log(`30 Day Max Payment Failure Rate: ${tdfr.CARD_TYPE}, ${tdfr.FAILURE_RATE}%`)
        // const rrsixty = await returnRate(60)
        // console.log(`60 Day Return Rate: ${rrsixty}`)
        // const rryear = await returnRate(365)
        // console.log(`365 Day Return Rate: ${rryear}`)
        // const odbxmp = await blindReturns(1, false)
        // console.log(`1 Day Blind Return Rate (Excluding Marketplace): ${odbxmp}%`)
        // const owbxmp = await blindReturns(7, false)
        // console.log(`1 Day Blind Return Rate (Excluding Marketplace): ${owbxmp}%`)
        // const odbmp = await blindReturns(1, true)
        // console.log(`1 Day Blind Return Rate for Marketplace: ${odbmp}`)
        // const acr = await allCancelRates(1)
        // console.log(`Highest Cancel Rate of 1, 7, 30, 90, 365 Day Intervals: ${acr}%`)
        // const ctsov = await cancelToStoreOrVendor()
        // console.log(`Cancel Rate to Store or Vendor: ${ctsov}%`)
        // const oprat = await openRates()
        // oprat.forEach((line) => {
        //     switch(Object.keys(line)[0]) {
        //         case "3PL":
        //             console.log(`Orders Open 2-3 Days Rate for 3PL: ${Object.values(line)[0]}%`);
        //             break;
        //         case "DropShipVendor":
        //             console.log(`Orders Open 2-3 Days Rate for Vendor: ${Object.values(line)[0]}%`);
        //             break;
        //         case "OwnedWM":
        //             console.log(`Orders Open 2-3 Days Rate for DC: ${Object.values(line)[0]}%`);
        //             break;
        //         case "StoreRegular":
        //             console.log(`Orders Open 2-3 Days Rate for Stores: ${Object.values(line)[0]}%`);
        //             break;
        //         case "SevenDayOpen":
        //             console.log(`Orders Open 7 Days Rate: ${Object.values(line)[0]}%`);
        //             break;
        //         case "ThirtyDatOpenDC3PLStore":
        //             console.log(`Orders Open 30 Days Rate for DC, 3PL, and Store: ${Object.values(line)[0]}%`);
        //             break;
        //         case "OpenThirtyDays":
        //             console.log(`Orders Open 30 Days: ${Object.values(line)[0]}`);
        //             break;
        //         case "VendorThirtyDayRate":
        //             console.log(`Orders Open 30 Days Rate for Vendor: ${Object.values(line)[0]}%`);
        //             break;
        //         case "VendorSevenDayRate":
        //             console.log(`Orders Open 7 Days Rate for Vendor: ${Object.values(line)[0]}%`);
        //             break;
        //         case "OneDayTotal":
        //             oneDayTotal = Object.values(line)[0]
        //             break;
        //         case "TwoDayTotal":
        //             twoDayTotal = Object.values(line)[0]
        //             break;
        //         case "TotalOrders":
        //             totalOrders = Object.values(line)[0]
        //             break;
        //     }
        // })
        // const borat = await backorderRates(oneDayTotal, twoDayTotal, totalOrders)
        // borat.forEach((line) => {
        //     switch(Object.keys(line)[0]) {
        //         case "BackorderOneDay":
        //             console.log(`Backorder Rate for 1 Day: ${Object.values(line)[0]}%`);
        //             break;
        //         case "BackorderThirtyDay":
        //             console.log(`Backorder Rate for 30 Days: ${Object.values(line)[0]}%`);
        //             break;
        //         case "AllocatedTwoDay":
        //             console.log(`Allocated Rate for 2 Days: ${Object.values(line)[0]}%`);
        //             break;
        //         case "AllocatedThirtyDayRate":
        //             console.log(`Allocated Rate for 30 Days: ${Object.values(line)[0]}%`);
        //             break;
        //         case "AllocatedThirtyDayTotal":
        //             console.log(`Allocated Total for 30 days: ${Object.values(line)[0]}`);
        //             break;
        //         case "AllocatedTenDayTotal":
        //             console.log(`Allocated Total for 10 days: ${Object.values(line)[0]}`);
        //             break;
        //     }
        // })
        // const rts = await returnToShelf()
        // console.log(`Orders Returned to Pick Shelf: ${rts}`)
        // const sps = await stalePickStatus()
        // console.log(`Orders Stale in Pick Status: ${sps}`)
        // const odusfrvsfr = Object.values(odfill.find((line) => line.FULFILLMENT_TYPE === "StoreRegular"))[1] - sufrod
        // console.log(`Unique Store Fill Rate vs Store Fill Rate: ${odusfrvsfr}%`)
        // const sbr = await storeBounceRate()
        // console.log(`Store Bounce Rate 1 Day: ${sbr}%`)
        // const tb = await tenBounce()
        // console.log(`Open Orders that have Bounced to Stores 10 Times or More: ${tb}`)
        // const utb = await uniqueTenBounce()
        // console.log(`Open Orders that have Bounced to the Same Store 10 Times or More: ${utb}`)
        // const uvfr = await uniqueVendorFillRate(1)
        // const oduvfrvvfr = Object.values(odfill.find((line) => line.FULFILLMENT_TYPE === "DropShipVendor"))[1] - uvfr
        // console.log(`Unique Vendor Fill Rate vs Vendor Fill Rate: ${oduvfrvvfr}%`)
        // const vbr = await vendorBounceRate()
        // console.log(`Vendor Bounce Rate: ${vbr}%`)
        // const vtb = await vendorTenBounce()
        // console.log(`Open Orders that have Bounced to Vendors 10 Times or More: ${vtb}`)
        // const bls = await bopisLineShorts()
        // const blc = await bopisLineCancels()
        // const bcr = Math.floor(bls / blc * 10000) / 100
        // console.log(`BOPIS Cancellation Rate: ${bcr}%`)
        // console.log("-----")
        rows.forEach((r, i) => {
            r.forEach((c, j) => {
                const cell = worksheet.getCell(`${letters[j] + (i + 1)}`)
                console.log(letters[j] + (i + 1))
                cell.value = c                    
                cell.border = {top: {style: "thick"}, left: {style: "thick"}, bottom: {style: "thick"}, right: {style: "thick"}}
                cell.alignment = {vertical: "center", horizontal: "center"}
                if(i === 0) {
                    cell.font = {name: 'Calibri', size: 9, bold: true}
                } else {
                    cell.font = {name: 'Calibri', size: 9}
                }
                if(j === 6) {
                    switch(c) {
                        case "Exceeds SLA":
                            cell.fill = {type: "pattern", pattern: "solid", fgColor: {argb: "FF008000"}};
                            break;
                        case "Meets SLA":
                            cell.fill = {type: "pattern", pattern: "solid", fgColor: {argb: "FF90EE90"}};
                            break;
                        case "Fails to meet SLA":
                            cell.fill = {type: "pattern", pattern: "solid", fgColor: {argb: "FFFF0000"}};
                            break;
                    }
                }
            })
        })
        await workbook.xlsx.writeFile("GBG.xlsx")
    } catch (e) {
        console.error(e)
    }
    process.exit()   
}

buildReport()