const fetch = require("node-fetch");

exports.handler = async function (event) {
    // 解析前端传来的参数*
    const { date_from, date_to, time_from, time_to, station } = event.queryStringParameters;

    // 如果参数缺失，返回错误
    if (!date_from || !date_to || !time_from || !time_to || !station) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Fehlende Parameter! Bitte geben Sie date_from, date_to, time_from, time_to und station an." })
        };
    }

    // 动态构造 UBA API URL
    const ubaUrl = `https://www.umweltbundesamt.de/api/air_data/v3/airquality/json?date_from=${date_from}&date_to=${date_to}&time_from=${time_from}&time_to=${time_to}&station=${station}`;

    try {
        const response = await fetch(ubaUrl);
        const data = await response.json();

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "UBA API-Anfrage fehlgeschlagen", details: error.message })
        };
    }
};
