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
    const { date, hour } = getCurrentTime();
    const apiUrl = `${API_BASE_URL}date_from=${date}&date_to=${date}&time_from=${hour}&time_to=${hour}&station=${stationId}`;

    console.log(`📡 Anfrage an API: ${apiUrl}`); // ✅ 先打印 API 请求 URL

    return fetch(apiUrl)
        .then(response => {
            console.log(`📡 API Antwort Status für ${stationId}:`, response.status); // ✅ 检查 API 响应状态
            if (!response.ok) {
                throw new Error(`❌ API Fehler ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`📊 API Daten für ${stationId}:`, data); // ✅ 检查 API 数据
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
            if (timestamps.length === 0) return;
            let latestTimestamp = timestamps[timestamps.length - 1];
            let pollutantData = data.data[stationId][latestTimestamp].slice(3);

            let popupContent = `<h3>Messstation ${stationId}</h3><p><b>Messzeit:</b> ${latestTimestamp}</p>`;
            pollutantData.forEach(entry => {
                popupContent += `<p><b>ID ${entry[0]}:</b> ${entry[1]} µg/m³</p>`;
            });

            let latLng = getStationCoordinates(stationId);
            let marker = L.marker(latLng).bindPopup(popupContent);
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
    return stationCoords[stationId] || [51.455643, 7.011555]; // 默认 Essen 坐标
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
