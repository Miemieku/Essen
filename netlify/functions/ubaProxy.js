const fetch = require("node-fetch");

exports.handler = async function (event) {
    const { api, date_from, date_to, time_from, time_to, station, city } = event.queryStringParameters;

    if (!api) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Fehlende API-Parameter! Bitte geben Sie api an." })
        };
    }

    let apiUrl;
    
    if (api === "airQuality") {
        if (!date_from || !date_to || !time_from || !time_to || !station) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Fehlende Parameter! Bitte geben Sie date_from, date_to, time_from, time_to und station an." })
            };
        }
        apiUrl = `https://www.umweltbundesamt.de/api/air_data/v3/airquality/json?date_from=${date_from}&date_to=${date_to}&time_from=${time_from}&time_to=${time_to}&station=${station}`;
    
    } else if (api === "stationCoordinates") {
        apiUrl = `https://www.umweltbundesamt.de/api/air_data/v3/stations/json`;
    
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Ungültiger API-Parameter!" })
        };
    }

    console.log(`📡 API-Anfrage an: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API-Fehler: ${response.status} ${response.statusText}`);
        }

        let data = await response.json();
        console.log("📊 API Antwort:", data);

        // ✅ 处理测量站 API 数据，筛选出 `Essen` 站点
        if (api === "stationCoordinates") {
            if (!data || !data.data) {
                throw new Error("Keine Stationsdaten erhalten.");
            }

            let filteredStations = data.data.filter(entry => entry[3] === "Essen"); // `3` 是城市名称字段

            if (filteredStations.length === 0) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: "Keine Messstationen für Essen gefunden!" })
                };
            }

            console.log(`✅ Gefundene Messstationen für Essen:`, filteredStations);

            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(filteredStations) // 只返回 `Essen` 的站点
            };
        }

        // ✅ 处理空气质量 API
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
        console.error(`❌ Fehler bei API-Anfrage an ${apiUrl}:`, error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "API-Anfrage fehlgeschlagen", details: error.message })
        };
    }
};
