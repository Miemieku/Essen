const API_BASE_URL = "https://datenplattform-essen.netlify.app/.netlify/functions/ubaProxy/airQualityProxy?";
const stations = ["DENW134", "DENW043", "DENW247", "DENW024"];
let mapMarkers = {}; // 存储测量站点的 Marker

// 1️⃣ 获取当前时间并构造 API URL
function getCurrentTime() {
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const hour = now.getHours(); // 获取当前小时
    return { date, hour };
}

// 2️⃣ 获取空气质量数据
function fetchAirQualityData(stationId) {
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
    let hour = now.getHours() - 1; // 🚀 取上一个小时的数据

    // 确保小时数不为负数（午夜 00:00 时，避免 -1）
    if (hour < 0) {
        hour = 23; // 取前一天的 23:00 数据
        date = new Date(now.setDate(now.getDate() - 1)).toISOString().split("T")[0]; // 取前一天的日期
    }

    const apiUrl = `${API_BASE_URL}?date_from=${date}&date_to=${date}&time_from=${hour}&time_to=${hour}&station=${stationId}`;

    console.log(`📡 API Anfrage: ${apiUrl}`); // ✅ 确保 URL 正确

    return fetch(apiUrl)
        .then(response => {
            console.log(`📡 API Antwort Status für ${stationId}:`, response.status);
            if (!response.ok) {
                throw new Error(`❌ API Fehler ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`📊 API Daten für ${stationId}:`, data);
            return data;
        })
        .catch(error => console.error(`❌ Fehler beim Laden der Luftqualität für ${stationId}:`, error));
}


// 3️⃣ 在地图上添加测量站点
function addStationsToMap() {
    stations.forEach(stationId => {
        fetchAirQualityData(stationId).then(data => {
            if (!data || !data.data || !data.data[stationId]) {
                console.warn(`⚠️ Keine Luftqualitätsdaten für ${stationId}`);
                return;
            }

            let timestamps = Object.keys(data.data[stationId]);
            if (timestamps.length === 0) {
                console.warn(`⚠️ Keine Messwerte für ${stationId}`);
                return;
            }
            let latestTimestamp = timestamps[timestamps.length - 1];
            let pollutantData = data.data[stationId][latestTimestamp].slice(3);

            let popupContent = `<h3>Messstation ${stationId}</h3><p><b>Messzeit:</b> ${latestTimestamp}</p>`;
            pollutantData.forEach(entry => {
                popupContent += `<p><b>ID ${entry[0]}:</b> ${entry[1]} µg/m³</p>`;
            });

            let latLng = getStationCoordinates(stationId);
            let marker = L.marker(latLng).bindPopup(popupContent);

            console.log(`📍 Station ${stationId} Marker erstellt:`, marker); // ✅ 检查 Marker 是否创建成功

            if (!marker) {
                console.error(`❌ Fehler: Marker für ${stationId} ist undefined`);
                return;
            }

            marker.on("click", () => showDataInPanel(stationId, latestTimestamp, pollutantData));
            marker.addTo(map);
            mapMarkers[stationId] = marker;
        });
    });
}


// 4️⃣ 获取测量站的地理坐标
function getStationCoordinates(stationId) {
    const stationCoords = {
        "DENW134": [51.4501, 7.0132],
        "DENW043": [51.4458, 7.0154],
        "DENW247": [51.4609, 7.0098],
        "DENW024": [51.4550, 7.0200]
    };

    if (!stationCoords[stationId]) {
        console.warn(`⚠️ Keine Koordinaten für ${stationId} gefunden, Standardwert wird verwendet.`);
        return [51.455643, 7.011555]; // 默认坐标
    }
    return stationCoords[stationId];
}

// 5️⃣ 在右侧面板显示空气质量数据
function showDataInPanel(stationId, timestamp, pollutantData) {
    let panel = document.getElementById("air-quality-panel");
    panel.innerHTML = `<h2>Messstation ${stationId}</h2><p><b>Messzeit:</b> ${timestamp}</p>`;
    pollutantData.forEach(entry => {
        panel.innerHTML += `<p><b>ID ${entry[0]}:</b> ${entry[1]} µg/m³</p>`;
    });
    panel.style.display = "block";
}

// 6️⃣ 监听用户点击 "Luftqualität" 复选框
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("air-quality").addEventListener("change", function () {
        if (this.checked) {
            addStationsToMap();
        } else {
            Object.keys(mapMarkers).forEach(stationId => map.removeLayer(mapMarkers[stationId]));
            mapMarkers = {};
        }
    });
});
