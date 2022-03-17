// const args = process.argv.filter((arg) => !arg.includes("C:") && arg.includes("=")).map((arg) => {  
//         let kvp = arg.split('=')
//         let obj = {}
//         obj[kvp[0]] = kvp[1]
//         return obj
//     })
// module.exports = {args}

const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1')
const { bopisProcessingTime } = require("./queryFunctions/bopisProcessingTime");
const { cancellations, storeVendorDCCancel, allCancelRates, cancelToStoreOrVendor, bopisLineShorts, bopisLineCancels } = require("./queryFunctions/cancellations");
const { currentOpenCriticalTickets, criticalTicketsCreated } = require("./requestFunctions/criticalTickets")
const { backorderedSuccessful, stuckInAllocated, timeToRelease } = require("./queryFunctions/allocatedReleased")
const { failRate } = require("./queryFunctions/payment");
const { fillRate, storeFirstFillRates, uniqueStoreFillRate, successRate } = require("./queryFunctions/fulfillment");
const { returnRate, blindReturns } = require("./queryFunctions/returns")
const { openRates, backorderRates, returnToShelf, stalePickStatus } = require("./queryFunctions/orderAging")
const { storeBounceRate, tenBounce, uniqueTenBounce, uniqueVendorFillRate, vendorBounceRate, vendorTenBounce } = require("./queryFunctions/bounceReport")
const { released, shipped, delivered } = require("./queryFunctions/promiseDates")
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
        let sla, tar, act, res, ind, typ
        rows.push(row)
        //
        console.log("-----")
        const bpt1 = await bopisProcessingTime(1)
        console.log(`1 Day Average N97 Order Processing Time: ${bpt1} minutes`)
        act = bpt1
        sla = 15
        tar = 10
        ind = "<="
        typ = "m"
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["BOPIS Orders Store", "Processing", "N[97] time to take BOPIS to get to store - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const bpt7 = await bopisProcessingTime(7)
        console.log(`7 Day Average N97 Order Processing Time: ${bpt7} minutes`)
        act = bpt7
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["BOPIS Orders Store", "Processing", "N[97] time to take BOPIS to get to store - 7d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const can1 = await cancellations(1)
        console.log(`1 Day Cancel Rate: ${can1}%`)
        sla = 4
        tar = 2
        ind = "<"
        typ = "%"
        act = can1
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Cancellation", "Cancellation", "Total Cancellation Rate - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const can7 = await cancellations(7)
        console.log(`7 Day Cancel Rate: ${can7}%`)
        sla = 3
        act = can7
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Cancellation", "Cancellation", "Total Cancellation Rate - 7d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const svdc1 = await storeVendorDCCancel(1)
        console.log(`1 Day Store, Vendor and DC Cancels: ${svdc1}%`)
        sla = 60
        tar = 30
        ind = "<"
        act = svdc1
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Cancellation", "Cancellation", "Rate of Order Cancellations Sourcing from Fulfillment - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const acr = await allCancelRates(1)
        console.log(`Highest Cancel Rate of 1, 7, 30, 90, 365 Day Intervals: ${acr}%`)
        sla = 3
        tar = 1.5
        act = acr
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Cancellation", "Cancellation", `All Cancel Rates - Current`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const ctsov = await cancelToStoreOrVendor()
        console.log(`Cancel Rate to Store or Vendor: ${ctsov}%`)
        sla = 50
        tar = 40
        act = ctsov
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Cancellation", "Cancellation", `Rate of Cancels to Store or Vendor - 1d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const coct = await currentOpenCriticalTickets()
        console.log(`Current Unresolved Critical Issues: ${coct}`)
        sla = 0
        tar = 0
        ind = "<="
        typ = ""
        act = coct
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Critical Tickets", "DevOps", "Open Critical Tickets - Current", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const ctc = await criticalTicketsCreated()
        console.log(`1 Day Critical Tickets Created: ${ctc}`)
        sla = 1
        act = ctc
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Critical Tickets", "DevOps", "Critical Tickets Created - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        //add orderImport query functions
        //
        const bs = await backorderedSuccessful()
        console.log(`Current Backorder Rate: ${bs.BACKORDERED}%`)
        sla = 1
        tar = 0.55
        typ = "%"
        ind = "<"
        act = bs.BACKORDERED
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Allocated vs. Released", "Processing", "Rate of New Orders on Backorder - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        console.log(`Current Success Rate: ${bs.SUCCESSFUL}%`)
        sla = 97
        tar = 100
        ind = ">="
        act = bs.SUCCESSFUL
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Allocated vs. Released", "Processing", "Rate of New Orders Released to Fulfillment (exceptions include, hold, remorse) - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const sia = await stuckInAllocated()
        console.log(`Orders Stuck in Allocated, Not On Hold: ${sia}`)
        sla = 5
        tar = 0
        typ = ""
        ind = "<="
        act = sia
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Allocated vs. Released", "Processing", "Orders Stuck in Allocated and Not On Hold - Current", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const ttr = await timeToRelease() 
        console.log(`Average N97 Time to Release for ITS: ${ttr.ITS} minutes`)
        sla = 180
        tar = 70
        typ = "m"
        ind = "<"
        act = ttr.ITS
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: ITS - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        console.log(`Average N97 Time to Release for LEA: ${ttr.LEA} minutes`)
        sla = 180
        act = ttr.LEA
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: LEA - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        console.log(`Average N97 Time to Release for LPS: ${ttr.LPS} minutes`)
        sla = 90
        tar = 70
        act = ttr.LPS
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: LPS - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        console.log(`Average N97 Time to Release for PSW: ${ttr.PSW} minutes`)
        sla = 180
        tar = 70
        act = ttr.PSW
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: PSW - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        console.log(`Average N97 Time to Release for PRO: ${ttr.PRO} minutes`)
        sla = 240
        tar = 70
        act = ttr.PRO
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: PRO - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        console.log(`Average N97 Time to Release for MP: ${ttr.MP} minutes`)
        sla = 15
        tar = 10
        act = ttr.MP
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Allocated vs. Released", "Processing", "N[97] Avg. Time to Release by Brand: MP - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const ytdsr = await successRate(true)
        console.log(`STS YTD Success Rate: ${ytdsr}%`)
        sla = 85
        tar = 93
        act = ytdsr
        ind = ">="
        typ = "%"
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["STS Success Rate", "Fulfillment", "SFS Success Rate - Fiscal YTD", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const tdsr = await successRate(false)
        console.log(`STS YTD Success Rate: ${tdsr}%`)
        sla = 85
        tar = 93
        act = tdsr
        ind = ">="
        typ = "%"
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["STS Success Rate", "Fulfillment", "SFS Success Rate - 30d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const pdrthree = await released(3)
        pdrthree.forEach((line) => {
            switch(line.Org) {
                
            }
        })
        //
        const odfill = await fillRate(1)
        odfill.forEach((line) => {
            let fType
            ind = ">="
            typ = "%"
            act = line.FILL_RATE
            console.log(`1 Day Fill Rate for ${line.FULFILLMENT_TYPE}: ${line.FILL_RATE}%`)
            switch (line.FULFILLMENT_TYPE) {
                case "3PL":
                    sla = 95
                    tar = 97
                    fType = "3PL"
                    break;
                case "DropShipVendor":
                    sla = 90
                    tar = 93
                    fType = "Vendor"
                    break;
                case "OwnedWM":
                    sla = 97
                    tar = 98.5
                    fType = "DC"
                    break;
                case "StoreRegular":
                    sla = 80
                    tar = 85
                    fType = "Store"
                    break;
            }
            oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
            row = ["BO/Vendor/Store Fulfillment", "Fulfillment", `${fType}s Fill Rate - 1d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
            rows.push(row)
        })
        //
        const owfill = await fillRate(7)
        owfill.forEach((line) => {
            let fType
            ind = ">="
            act = line.FILL_RATE
            console.log(`7 Day Fill Rate for ${line.FULFILLMENT_TYPE}: ${line.FILL_RATE}%`)
            switch (line.FULFILLMENT_TYPE) {
                case "3PL":
                    sla = 95
                    tar = 97
                    fType = "3PL"
                    break;
                case "DropShipVendor":
                    sla = 90
                    tar = 93
                    fType = "Vendor"
                    break;
                case "OwnedWM":
                    sla = 97
                    tar = 98.5
                    fType = "DC"
                    break;
                case "StoreRegular":
                    sla = 80
                    tar = 85
                    fType = "Store"
                    break;
            }
            oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
            row = ["BO/Vendor/Store Fulfillment", "Fulfillment", `${fType}s Fill Rate - 7d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
            rows.push(row)
        })
        //
        const sufrod = await uniqueStoreFillRate(1)
        console.log(`1 Day Store Unique Fill Rate: ${sufrod}%`)
        sla = 80
        tar = 85
        act = sufrod
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["BO/Vendor/Store Fulfillment", "Fulfillment", `Store Unique Fill Rate - 1d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const sufrow = await uniqueStoreFillRate(7)
        console.log(`7 Day Store Unique Fill Rate: ${sufrow}%`)
        act = sufrow
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["BO/Vendor/Store Fulfillment", "Fulfillment", `Store Unique Fill Rate - 7d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const sfod = await storeFirstFillRates(1)
        console.log(`1 Day Store First Fill Rate: ${sfod}%`)
        act = sfod
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["BO/Vendor/Store Fulfillment", "Fulfillment", `Store First Fill Rate - 1d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const sfow = await storeFirstFillRates(7)
        console.log(`7 Day Store First Fill Rate: ${sfow}%`)
        act = sfow
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["BO/Vendor/Store Fulfillment", "Fulfillment", `Store First Fill Rate - 7d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const odfr = await failRate(1)
        console.log(`1 Day Max Payment Failure Rate: ${odfr.CARD_TYPE}, ${odfr.FAILURE_RATE}%`)
        sla = 10
        tar = 1.5
        ind = "<"
        act = odfr.FAILURE_RATE
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Settlement/Reauth Failure", "Payment", `Credit Card Fail Rate - 1d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${odfr.CARD_TYPE}: ${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const owfr = await failRate(7)
        console.log(`7 Day Max Payment Failure Rate: ${owfr.CARD_TYPE}, ${owfr.FAILURE_RATE}%`)
        sla = 2
        tar = 1
        ind = "<"
        act = owfr.FAILURE_RATE
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Settlement/Reauth Failure", "Payment", `Credit Card Fail Rate - 7d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${owfr.CARD_TYPE}: ${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const tdfr = await failRate(30)
        console.log(`30 Day Max Payment Failure Rate: ${tdfr.CARD_TYPE}, ${tdfr.FAILURE_RATE}%`)
        sla = 1.5
        tar = 0.5
        ind = "<"
        act = tdfr.FAILURE_RATE
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Settlement/Reauth Failure", "Payment", `Credit Card Fail Rate - 30d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${tdfr.CARD_TYPE}: ${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const rrsixty = await returnRate(60)
        console.log(`60 Day Return Rate: ${rrsixty}`)
        sla = 5
        tar = 2.5
        act = rrsixty
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Returns (Blind), Rate, Age", "Returns", `Return Rate - 60d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const rryear = await returnRate(365)
        console.log(`365 Day Return Rate: ${rryear}`)
        act = rryear
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Returns (Blind), Rate, Age", "Returns", `Return Rate - 365d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const odbxmp = await blindReturns(1, false)
        console.log(`1 Day Blind Return Rate (Excluding Marketplace): ${odbxmp}%`)
        sla = 30
        tar = 15
        act = odbxmp
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Returns (Blind), Rate, Age", "Returns", `Blind Returns (Non-Marketplace) - 1d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const owbxmp = await blindReturns(7, false)
        console.log(`7 Day Blind Return Rate (Excluding Marketplace): ${owbxmp}%`)
        sla = 60
        tar = 25
        act = owbxmp
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Returns (Blind), Rate, Age", "Returns", `Blind Returns (Non-Marketplace) - 7d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const odbmp = await blindReturns(1, true)
        console.log(`1 Day Blind Return Rate for Marketplace: ${odbmp}`)
        sla = 50
        tar = 15
        act = odbmp
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Returns (Blind), Rate, Age", "Returns", `Blind Returns (Marketplace) - 1d`, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const oprat = await openRates()
        oprat.forEach((line) => {
            let met 
            typ = "%"
            act = Object.values(line)[0]
            switch(Object.keys(line)[0]) {
                case "3PL":
                    console.log(`Orders Open 2-3 Days Rate for 3PL: ${Object.values(line)[0]}%`);
                    sla = 1
                    tar = 0.5
                    met = "Rate of Open 3PL Orders for 2-3d - Current"
                    break;
                case "DropShipVendor":
                    console.log(`Orders Open 2-3 Days Rate for Vendor: ${Object.values(line)[0]}%`);
                    sla = 10
                    met = "Rate of Open Vendor Orders for 2-3d - Current"
                    tar = 5
                    break;
                case "OwnedWM":
                    console.log(`Orders Open 2-3 Days Rate for DC: ${Object.values(line)[0]}%`);
                    sla = 1
                    tar = 0.5
                    met = "Rate of Open DC Orders for 2-3d - Current"
                    break;
                case "StoreRegular":
                    console.log(`Orders Open 2-3 Days Rate for Stores: ${Object.values(line)[0]}%`);
                    sla = 5
                    tar = 1
                    met = "Rate of Open Store Orders for 2-3d - Current"
                    break;
                case "SevenDayOpen":
                    console.log(`Orders Open 7 Days Rate: ${Object.values(line)[0]}%`);
                    sla = 20
                    tar = 10
                    met = "Rate of Open Orders 7-30d - Current"
                    break;
                case "ThirtyDayOpenDC3PLStore":
                    console.log(`Orders Open 30 Days Rate for DC, 3PL, and Store: ${Object.values(line)[0]}%`);
                    sla = 5
                    tar = 2.5
                    met = "Rate of Open Orders Open 30d+ (non-Vendor) - Current"
                    break;
                case "OpenThirtyDays":
                    console.log(`Orders Open 30 Days: ${Object.values(line)[0]}`);
                    sla = 300
                    tar = 150
                    met = "Total Open Orders 30d+ - Current"
                    typ = ""
                    break;
                case "VendorThirtyDayRate":
                    console.log(`Orders Open 30 Days Rate for Vendor: ${Object.values(line)[0]}%`);
                    sla = 10
                    tar = 5
                    met = "Rate of Open Vendor Orders Open 30d+ - Current"
                    break;
                case "VendorSevenDayRate":
                    console.log(`Orders Open 7 Days Rate for Vendor: ${Object.values(line)[0]}%`);
                    sla = 20
                    tar = 10
                    met = "Rate of Open Vendor Orders for 7-30d - Current"
                    break;
                case "OneDayTotal":
                    oneDayTotal = Object.values(line)[0]
                    break;
                case "TwoDayTotal":
                    twoDayTotal = Object.values(line)[0]
                    break;
                case "TotalOrders":
                    totalOrders = Object.values(line)[0]
                    break;
            }
            if (Object.keys(line)[0] !== "OneDayTotal" && Object.keys(line)[0] !== "TwoDayTotal" && Object.keys(line)[0] !== "TotalOrders") {
                oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
                row = ["Order Aging", "Fulfillment", met, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
                rows.push(row)
            }
        })
        //
        const borat = await backorderRates(oneDayTotal, twoDayTotal, totalOrders)
        borat.forEach((line) => {
            let met
            act = Object.values(line)[0]
            typ = "%"
            switch(Object.keys(line)[0]) {
                case "BackorderOneDay":
                    console.log(`Backorder Rate for 1 Day: ${Object.values(line)[0]}%`);
                    sla = 2
                    tar = 2
                    met = "Rate of Backordered Orders Open for 1d - Current"
                    break;
                case "BackorderThirtyDay":
                    console.log(`Backorder Rate for 30 Days: ${Object.values(line)[0]}%`);
                    sla = 30
                    tar = 15
                    met = "Rate of Backordered Orders Open for 30d+ - Current"
                    break;
                case "AllocatedTwoDay":
                    console.log(`Allocated Rate for 2 Days: ${Object.values(line)[0]}%`);
                    sla = 10
                    tar = 5
                    met = "Rate of Allocated Orders Open for 1-2d - Current"
                    break;
                case "AllocatedThirtyDayRate":
                    console.log(`Allocated Rate for 30 Days: ${Object.values(line)[0]}%`);
                    sla = 5
                    tar = 2
                    met = "Rate of Allocated Orders Open for 30d+ - Current"
                    break;
                case "AllocatedThirtyDayTotal":
                    console.log(`Allocated Total for 30 days: ${Object.values(line)[0]}`);
                    sla = 50
                    tar = 25
                    met = "Total Allocated Orders Open for 30d+ - Current"
                    typ = ""
                    break;
                case "AllocatedTenDayTotal":
                    console.log(`Allocated Total for 10 days: ${Object.values(line)[0]}`);
                    sla = 100
                    tar = 40
                    met = "Total Allocated Orders Open for 10d+ - Current"
                    typ = ""
                    break;
            }
            oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
            row = ["Order Aging", "Fulfillment", met, `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
            rows.push(row)
        })
        //
        const rts = await returnToShelf()
        console.log(`Orders Returned to Pick Shelf: ${rts}`)
        sla = 50
        tar = 30
        typ = ""
        act = rts
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Order Aging", "Fulfillment", "Orders Returned to Pick Shelf - 3d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const sps = await stalePickStatus()
        console.log(`Orders Stale in Pick Status: ${sps}`)
        sla = 25
        tar = 5
        act = sps
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Order Aging", "Fulfillment", "Orders Stale in Pick Status - Current", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const odusfrvsfr = Math.floor(Math.abs(Object.values(odfill.find((line) => line.FULFILLMENT_TYPE === "StoreRegular"))[1] - sufrod) * 100) / 100
        console.log(`Unique Store Fill Rate vs Store Fill Rate: ${odusfrvsfr}%`)
        sla = 10
        tar = 5
        typ = "%"
        act = odusfrvsfr
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Bounce Report", "Store Performance", "Store Unique Fill Rate vs. Store fill Rate - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const sbr = await storeBounceRate()
        console.log(`Store Bounce Rate 1 Day: ${sbr}%`)
        sla = 3
        tar = 1.5
        act = sbr
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Bounce Report", "Store Performance", "Store Bounce Rate - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const tb = await tenBounce()
        console.log(`Open Orders that have Bounced to Stores 10 Times or More: ${tb}`)
        sla = 100
        tar = 50
        act = tb
        typ = ""
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Bounce Report", "Store Performance", "Total Open Orders that have Bounced 10+ times - Current", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const utb = await uniqueTenBounce()
        console.log(`Open Orders that have Bounced to the Same Store 10 Times or More: ${utb}`)
        sla = 5
        tar = 2
        act = utb
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Bounce Report", "Store Performance", "Total Open Orders that have Bounced to the Same Store 10+ times - Current", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const uvfr = await uniqueVendorFillRate(1)
        const oduvfrvvfr = Object.values(odfill.find((line) => line.FULFILLMENT_TYPE === "DropShipVendor"))[1] - uvfr
        console.log(`Unique Vendor Fill Rate vs Vendor Fill Rate: ${oduvfrvvfr}%`)
        sla = 5
        tar = 2
        act = uvfr
        typ = "%"
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Bounce Report", "Store Performance", "Vendor Fill Rate vs. Unique Vendor Fill Rate - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const vbr = await vendorBounceRate()
        console.log(`Vendor Bounce Rate: ${vbr}%`)
        sla = 1.2
        tar = 1.1
        act = vbr
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Bounce Report", "Store Performance", "Vendor Bounce Rate - 1d", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const vtb = await vendorTenBounce()
        console.log(`Open Orders that have Bounced to Vendors 10 Times or More: ${vtb}`)
        sla = 25
        tar = 5
        act = vtb
        typ = ""
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Bounce Report", "Store Performance", "Total Open Vendor Orders that have Bounced 10+ times - Current", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        const bls = await bopisLineShorts()
        const blc = await bopisLineCancels()
        const bcr = Math.floor(bls / blc * 10000) / 100
        console.log(`BOPIS Cancellation Rate: ${bcr}%`)
        sla = 7
        tar = 5
        act = bcr
        typ = "%"
        oper[ind](act, tar) ? res = "Exceeds SLA" : oper[ind](act, sla) ? res = "Meets SLA" : res = "Fails to meet SLA"
        row = ["Bounce Report", "Store Performance", "BOPIS Cancellation Rate", `${ind} ${sla}${typ}`, `${ind} ${tar}${typ}`, `${act}${typ}`, res,  ""]
        rows.push(row)
        //
        // add JDA query functions
        //
        console.log("-----")
        rows.forEach((r, i) => {
            r.forEach((c, j) => {
                const cell = worksheet.getCell(`${letters[j] + (i + 1)}`)
                console.log(letters[j] + (i + 1))
                cell.value = c                    
                cell.border = {top: {style: "thick"}, left: {style: "thick"}, bottom: {style: "thick"}, right: {style: "thick"}}
                cell.alignment = {vertical: "center", horizontal: "center", wrapText: true}
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
        worksheet.getColumn("A").width = 20
        worksheet.getColumn("B").width = 13
        worksheet.getColumn("C").width = 57
        worksheet.getColumn("D").width = 7
        worksheet.getColumn("E").width = 7
        worksheet.getColumn("F").width = 13
        worksheet.getColumn("G").width = 13
        worksheet.getColumn("H").width = 20
        await workbook.xlsx.writeFile("GBG.xlsx")
    } catch (e) {
        console.error(e)
    }
    process.exit()   
}

buildReport()
