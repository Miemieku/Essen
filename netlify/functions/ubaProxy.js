const fetch = require("node-fetch");

exports.handler = async function (event) {
    const url = "https://www.umweltbundesamt.de/api/air_data/v3/components/json";

    try {
        const response = await fetch(url);
        const data = await response.json();

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // 允许前端访问
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

