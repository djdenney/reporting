const axios = require("axios");

async function currentOpenCriticalTickets(iteration = 0, issues = []) {
    const res = await axios.get(`https://lesliespool.atlassian.net/rest/api/3/search?jql=project = "Omnichannel Production Support" and priority = critical and statusCategory != Done &maxResults=100&fields=key,created,components,priority,status&startAt=${iteration * 100}`, {
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
    }
    issues = issues.concat(res.data.issues);
    if (res.data.total / 100 > iteration) {
        return currentOpenCriticalTickets(iteration + 1, issues);
    }
    return issues.length
}

async function criticalTicketsCreated(iteration = 0, issues = []) {
    const res = await axios.get(`https://lesliespool.atlassian.net/rest/api/3/search?jql=project = "Omnichannel Production Support" and component = critical and created >= -24h &maxResults=100&fields=key,created,components,priority,status&startAt=${iteration * 100}`, {
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
    }
    issues = issues.concat(res.data.issues);
    if (res.data.total / 100 > iteration) {
        return criticalTicketsCreated(iteration + 1, issues);
    }
    return issues.length
}

module.exports = {currentOpenCriticalTickets, criticalTicketsCreated}