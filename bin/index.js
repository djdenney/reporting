#! /usr/bin/env node
const axios = require("axios"); // http request library
const ExcelJS = require("exceljs"); // excel document writer client
const cliProgress = require("cli-progress") // progress bar library
const project = `Omnichannel Production Support`; 
const today = new Date().toISOString().slice(0, 10);
const ninetyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 91)).toISOString().slice(0, 10);
const baseUrl = 'https://lesliespool.atlassian.net'
const url = `${baseUrl}/rest/api/3/search?jql=project = "${project}" and created < ${today} and created >= ${ninetyDaysAgo}&maxResults=100&fields=key,created,components,priority,status`;
const gettingIssues = new cliProgress.SingleBar({format: ' {bar} {percentage}% | ETA: {eta}s'}, cliProgress.Presets.shades_classic);
const parsingIssues = new cliProgress.SingleBar({format: ' {bar} {percentage}% | ETA: {eta}s'}, cliProgress.Presets.shades_classic);
const buildingTables = new cliProgress.SingleBar({format: ' {bar} {percentage}% | ETA: {eta}s'}, cliProgress.Presets.shades_classic);


async function getIssues(iteration = 0, issues = []) {
    // request 100 issues matching jql
    // insert retrieved issues into array
    // recur until the length of the array matches the "total" returned in the response.
    // call parseIssues()
    const res = await axios.get(`${url}&startAt=${iteration * 100}`, {
        headers: {
            Authorization: "",
            // ^^auth value should be the word "Basic" followed by the base64 value of your email address and Jira API key
        },
        proxy: {
            protocol: "http",
            host: "proxy.lesl.com",
            port: 80,
        },
        // ^^uncomment for leslie's network proxy (only required while running script on office ethernet or wifi)
    });
    if (iteration === 0) {
        gettingIssues.start(res.data.total, 0)
    }
    issues = issues.concat(res.data.issues);
    if (res.data.total / 100 > iteration) {
        gettingIssues.update(issues.length)
        return getIssues(iteration + 1, issues);
    }
    gettingIssues.stop()
    parseIssues(issues);
}

function parseIssues(issues) {
    // initialize arrays for components, statuses, statusCategories, priorities, and ages
    // iterate through issues array
        // check age of current issue by calling checkAge()
        // create an array of ages for the current issue called issueAges by calling categorizeAge()
        // iterate through the components of the current issue
            // if the components array does not have any object key matching the name of the current issue's components
                // add a new object to the components array with a key matching the current issue's component name
        // ^^repeat for statuses, statusCategories, priorities, and ages arrays

        // iterate through the ages array and insert issue key as Object value for any Object key in the ages array that matches any element in the issueAges array
        // ^^repeat for components, statuses, statusCategories, and priorities arrays
         
    // call buildTables()
    console.log("parsing issues...")
    parsingIssues.start(issues.length, 0)
    const components = [];
    const statuses = [];
    const statusCategories = [];
    const priorities = [];
    const ages = [
        { "90 Day Summary": [] },
        { "30 Day Summary": [] },
        { "15 Day Summary": [] },
        { "7 Day Summary": [] },
        { "2 Day Summary": [] },
        { "1 Day Summary": [] },
    ];
    issues.forEach((issue) => {
        const age = checkAge(issue);
        const issueAges = categorizeAge(age);
        issue.fields.components.forEach((component) => {
            if (!components.filter((e) => Object.keys(e).includes(component.name)).length > 0) {
                const key = component.name;
                const arrayObject = {};
                arrayObject[key] = [];
                components.push(arrayObject);
            }
        });
        if (!statuses.filter((e) => Object.keys(e).includes(issue.fields.status.name)).length > 0) {
            const key = issue.fields.status.name;
            const arrayObject = {};
            arrayObject[key] = [];
            statuses.push(arrayObject);
        }
        if (!statusCategories.filter((e) => Object.keys(e).includes(issue.fields.status.statusCategory.name)).length > 0) {
            const key = issue.fields.status.statusCategory.name;
            const arrayObject = {};
            arrayObject[key] = [];
            statusCategories.push(arrayObject);
        }
        if (!priorities.filter((e) => Object.keys(e).includes(issue.fields.priority.name)).length > 0) {
            const key = issue.fields.priority.name;
            const arrayObject = {};
            arrayObject[key] = [];
            priorities.push(arrayObject);
        }
        ages.forEach((objectKey, i) => {
            issueAges.forEach((issueAge) => {
                if (issueAge === Object.keys(objectKey)[0]) {
                    ages[i][issueAge].push(issue.key);
                }
            });
        });
        components.forEach((objectKey, i) => {
            issue.fields.components.forEach((component) => {
                if (component.name === Object.keys(objectKey)[0]) {
                    components[i][component.name].push(issue.key);        
                }
            });
        });
        statuses.forEach((objectKey, i) => {
            if (issue.fields.status.name === Object.keys(objectKey)[0]) {
                statuses[i][issue.fields.status.name].push(issue.key);
            }
        });
        statusCategories.forEach((objectKey, i) => {
            if (issue.fields.status.statusCategory.name === Object.keys(objectKey)[0]) {
                statusCategories[i][issue.fields.status.statusCategory.name].push(issue.key);
            }
        });
        priorities.forEach((objectKey, i) => {
            if (issue.fields.priority.name === Object.keys(objectKey)[0]) {
                priorities[i][issue.fields.priority.name].push(issue.key);
            }
        });
    parsingIssues.increment(1)
    });
    parsingIssues.stop()
    buildTables(ages, components, statuses, statusCategories, priorities);
}

function checkAge(issue) {
    // initialize createdDate, which will be a midnight instance of the date the issue was created as a JS Date Object
    // initialize yesterday, which will be a midnight instance of the date prior to today as a JS Date Object
    // initialize age, which is a int that should represent the age of the issue in days
    // return age
    const createdDate = new Date(new Date(issue.fields.created).toISOString().slice(0, 10));
    const yesterday = new Date(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10));
    const age = (yesterday - createdDate) / 86400000;
    return age;
}

function categorizeAge(age, i = 90) {
    // initialize total days to iterate, default value of 90
    // initialize an array called ages
        // push "{age} Day Symmary" as element to ages array, recur until i = 0
    // return ages array
    const ages = [];
    if (age <= i && i > 0) {
        ages.push(`${i} Day Summary`)
        categorizeAge(age, i - 1)
    }
    return ages;
}

function buildTables(ages, components, statuses, statusCategories, priorities) {
    // initialize rows array
    // iterate ages
        // initialize rowOne, with current Object Key as 0th element
        // push rowOne to rows array
        // initialize emptyCell array with "" as 0th element and "Total" as 1st element
        // initialize rowTwo array as emptyCell appended with the name of each unique status
        // push rowTwo to rows array
        // iterate components array
            // initialize componentRow array
            // iterate statuses array
                // determine how many issues keys in the current status and component match as cellValue
                // push cellValue to componentRow array
            // initialize total variable, add all elements of componentRow Array
            // push total to 0th position in componentRow
            // push component name to 0th position in componentRow array
        // push empty string to create empty row
    // call makeSpreadsheet()
    console.log("building tables...")
    buildingTables.start(ages.length, 0)
    const rows = []
    ages.forEach((age) => {
        const rowOne = [Object.keys(age)[0]]
        rows.push(rowOne)
        const emptyCell = ['', "Total"]
        const rowTwo = emptyCell.concat(statuses.map((status) => Object.keys(status)[0]))
        rows.push(rowTwo)
        components.forEach((component) => {
            const componentRow = []
            statuses.forEach((status) => {
                const compFilter = Object.values(age)[0].filter((ai) => Object.values(component)[0].includes(ai))
                const statFilter = Object.values(age)[0].filter((ai) => Object.values(status)[0].includes(ai))
                const cellValue = compFilter.filter((ai) => statFilter.includes(ai)).length
                componentRow.push(cellValue)
                // if (cellValue > 0) {
                //     console.log(`${Object.keys(age)[0]} | ${Object.keys(component)[0]} | ${Object.keys(status)[0]}: ${cellValue}`)
                // }
                // ^^uncomment for log of cell values
            })
            let total = 0
            componentRow.forEach((n, i) => total = total + n)
            componentRow.unshift(total)
            componentRow.unshift(Object.keys(component)[0])
            rows.push(componentRow)
        })
        rows.push("")
        buildingTables.increment(1)
    })
    // console.log(rows)
    // ^^uncomment for log of raw rows array
    buildingTables.stop()
    makeSpreadsheet(rows)
}

async function makeSpreadsheet(rows) {
    // create workbook
    // create worksheet
    // add all created rows as block to worksheet
    // write file called "report.xlsx" to main directory
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("OPS Report");
    worksheet.addRows(rows)
    await workbook.xlsx.writeFile("report.xlsx")
    console.log("done!")
}
console.log("starting...")
getIssues();
console.log("getting issues...")

