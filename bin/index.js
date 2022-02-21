#! /usr/bin/env node
const axios = require("axios");
const ExcelJS = require("exceljs");
const cliProgress = require("cli-progress");
const project = `Omnichannel Production Support`;
const today = new Date().toISOString().slice(0, 10);
const ninetyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().slice(0, 10);
const baseUrl = "https://lesliespool.atlassian.net";
const url = `${baseUrl}/rest/api/3/search?jql=project = "${project}" and created < ${today} and created >= ${ninetyDaysAgo}&maxResults=100&fields=key,created,components,priority,status`;
const gettingIssues = new cliProgress.SingleBar({ format: " {bar} {percentage}% | ETA: {eta}s" }, cliProgress.Presets.shades_classic);
const parsingIssues = new cliProgress.SingleBar({ format: " {bar} {percentage}% | ETA: {eta}s" }, cliProgress.Presets.shades_classic);
const buildingTables = new cliProgress.SingleBar({ format: " {bar} {percentage}% | ETA: {eta}s" }, cliProgress.Presets.shades_classic);

async function getIssues(iteration = 0, issues = [], startDate) {
    const res = await axios.get(`${url}&startAt=${iteration * 100}`, {
        headers: {
            Authorization: "Basic ZGRlbm5leUBsZXNsLmNvbTpBcHhUZjBVUGdSemt1aEVPSzNCMTNFMUQ=",
        },
        proxy: {
            protocol: "http",
            host: "proxy.lesl.com",
            port: 80,
        },
    });
    if (iteration === 0) {
        console.log("getting issues...");
        gettingIssues.start(res.data.total, 0);
    }
    issues = issues.concat(res.data.issues);
    if (res.data.total / 100 > iteration) {
        gettingIssues.update(issues.length);
        return getIssues(iteration + 1, issues, startDate);
    }
    gettingIssues.stop();
    parseIssues(issues);
}

function parseIssues(issues) {
    console.log("parsing issues...");
    parsingIssues.start(issues.length, 0);
    const components = [];
    const statuses = [];
    const statusCategories = [];
    const priorities = [];
    const ages = [
        { "1 Day Summary": [] },
        { "2 Day Summary": [] },
        { "7 Day Summary": [] },
        { "15 Day Summary": [] },
        { "30 Day Summary": [] },
        { "90 Day Summary": [] },
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
        parsingIssues.increment(1);
    });
    parsingIssues.stop();
    buildTables(ages, components, statuses, statusCategories, priorities);
}

function checkAge(issue) {
    const createdDate = new Date(new Date(issue.fields.created).toISOString().slice(0, 10));
    const yesterday = new Date(new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 10));
    const age = (yesterday - createdDate) / 86400000;
    return age;
}

function categorizeAge(age) {
    const ages = [];
    if (age < 90) {
        ages.push(`90 Day Summary`);
    }
    if (age < 30) {
        ages.push(`30 Day Summary`);
    }
    if (age < 15) {
        ages.push(`15 Day Summary`);
    }
    if (age < 7) {
        ages.push(`7 Day Summary`);
    }
    if (age < 2) {
        ages.push(`2 Day Summary`);
    }
    if (age < 1) {
        ages.push(`1 Day Summary`);
    }
    return ages;
}

function buildTables(ages, components, statuses, statusCategories, priorities) {
    console.log("building tables...");
    buildingTables.start(ages.length, 0);
    const rows = [];
    ages.forEach((age) => {
        const rowOne = [Object.keys(age)[0]];
        rows.push(rowOne);
        const emptyCell = ["", "Total"];
        let rowTwo = emptyCell.concat(statuses.map((status) => Object.keys(status)[0]));
        rowTwo = rowTwo.concat(statusCategories.map((statusCategory) => Object.keys(statusCategory)[0]));
        rows.push(rowTwo);
        components.forEach((component) => {
            const componentRow = [];
            statuses.forEach((status) => {
                const compFilter = Object.values(age)[0].filter((ai) => Object.values(component)[0].includes(ai));
                const statFilter = Object.values(age)[0].filter((ai) => Object.values(status)[0].includes(ai));
                const cellValue = compFilter.filter((ai) => statFilter.includes(ai)).length;
                componentRow.push(cellValue);
                // if (cellValue > 0) {
                //     console.log(`${Object.keys(age)[0]} | ${Object.keys(component)[0]} | ${Object.keys(status)[0]}: ${cellValue}`)
                // }
            });
            // statusCategories.forEach((statusCategory) => {
            //     const compFilter = Object.values(age)[0].filter((ai) => Object.values(component)[0].includes(ai));
            //     const statFilter = Object.values(age)[0].filter((ai) => Object.values(statusCategory)[0].includes(ai));
            //     const cellValue = compFilter.filter((ai) => statFilter.includes(ai)).length;
            //     componentRow.push(cellValue);
            // });
            let total = 0;
            componentRow.forEach((n, i) => (total = total + n));
            if (total > 0) {
                componentRow.forEach((n, i) => (componentRow[i] = `${Math.round(((n / total) * 100 + Number.EPSILON) * 100) / 100}%`));
                componentRow.unshift(total);
                componentRow.unshift(Object.keys(component)[0]);
                rows.push(componentRow);
            }
        });
        rows.push("");
        buildingTables.increment(1);
    });
    // console.log(rows)
    buildingTables.stop();
    makeSpreadsheet(rows);
}

async function makeSpreadsheet(rows) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("OPS Report");
    worksheet.addRows(rows);
    worksheet._rows.forEach((row, i) => {
        row._cells.forEach((cell) => {
            if (cell._mergeCount > 0 && new String(cell._value.model.value).includes("Day Summary")) {
                const mergeLength = rows[i + 1].length;
                worksheet.mergeCells(`${cell._value.model.address}:${cell._value.model.address.slice(0, 0) + mergeLength}`);
            }
        });
    });
    await workbook.xlsx.writeFile("report.xlsx");
    console.log("done!");
}
console.log("starting...");
getIssues();
