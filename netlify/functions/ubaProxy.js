const fetch = require("node-fetch");

exports.handler = async function (event) {
    // 获取前端传来的参数
    const params = event.queryStringParameters;

    // 检查是否提供了动态参数
    if (!params.date_from || !params.date_to || !params.time_from || !params.time_to || !params.station) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "❌ 缺少必要参数: date_from, date_to, time_from, time_to, station" })
        };
    }

    // 构建 UBA API URL
    const url = `https://www.umweltbundesamt.de/api/air_data/v3/airquality/json?date_from=${params.date_from}&date_to=${params.date_to}&time_from=${params.time_from}&time_to=${params.time_to}&station=${params.station}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // 允许跨域请求
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "API 请求失败", details: error.message })
        };
    }
};
