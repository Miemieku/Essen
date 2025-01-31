const API_BASE_URL = "https://datenplattform-essen.netlify.app/.netlify/functions/ubaProxy/airQualityProxy?";
const stations = ["DENW134", "DENW043", "DENW247", "DENW024"];
let mapMarkers = {}; // 存储测量站点的 Marker
let airQualityData = {}; // 全局存储空气质量数据

// Load station coordinates from a JSON file
let stationCoords = {};
fetch('/path/to/stationCoordinates.json')
    .then(response => response.json())
    .then(data => {
        stationCoords = data;
    })
    .catch(error => {
        console.error('❌ Fehler beim Laden der Stationskoordinaten:', error);
    });

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
    let date = now.toISOString().split("T")[0]; // YYYY-MM-DD
    let hour = now.getHours() - 1; // 🚀 取上一个小时的数据

    // ⏰ 确保小时数不为负数（午夜 00:00 时，避免 -1）
    if (hour < 0) {
        hour = 23; // 取前一天的 23:00 数据
        date = new Date(now.setDate(now.getDate() - 1)).toISOString().split("T")[0]; // 取前一天的日期
    }

    const apiUrl = `${API_BASE_URL}date_from=${date}&date_to=${date}&time_from=${hour}&time_to=${hour}&station=${stationId}`;

    console.log(`📡 API Anfrage: ${apiUrl}`); // ✅ 确保 URL 正确

    return fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            console.log(`📌 API Antwort für ${stationId}:`, data);

            // ✅ 处理 API 响应，确保 stationId 正确
            const actualStationId = Object.keys(data.data)[0]; 
            console.log(`✅ Station ID Mapping: ${stationId} → ${actualStationId}`);

            if (!data || !data.data || !data.data[actualStationId]) {
                console.warn(`⚠️ Keine Luftqualitätsdaten für ${stationId}`);
                return null;
            }

            return { stationId: actualStationId, data: data.data[actualStationId] };
        })
        .catch(error => {
            console.error(`❌ Fehler beim Laden der Luftqualität für ${stationId}:`, error);
            return null;
        });
}


function addStationsToMap() {
    stations.forEach(stationId => {
        fetchAirQualityData(stationId).then(result => {
            if (!result || !result.data) {
                console.warn(`⚠️ Keine Luftqualitätsdaten für ${stationId}`);
                return;
            }

            let actualStationId = result.stationId; // ✅ 确保使用 API 返回的 Station ID
            let timestamps = Object.keys(result.data);

            if (timestamps.length === 0) {
                console.warn(`⚠️ Keine Messwerte für ${actualStationId}`);
                return;
            }

            let latestTimestamp = timestamps[timestamps.length - 1];
            let pollutantData = result.data[latestTimestamp].slice(3);

            let popupContent = `<h3>Messstation ${actualStationId}</h3><p><b>Messzeit:</b> ${latestTimestamp}</p>`;
            pollutantData.forEach(entry => {
                popupContent += `<p><b>ID ${entry[0]}:</b> ${entry[1]} µg/m³</p>`;
            });

            let latLng = getStationCoordinates(stationId);
            let marker = L.marker(latLng).bindPopup(popupContent);

            if (!marker) {
                console.error(`❌ Fehler: Marker für ${stationId} ist undefined`);
                return;
            }

            console.log(`📍 Station ${actualStationId} Marker erstellt:`, marker);
            marker.on("click", () => showDataInPanel(actualStationId, latestTimestamp, pollutantData));
            marker.addTo(map);
            mapMarkers[actualStationId] = marker; // ✅ 使用实际 Station ID 存储 Marker
        });
    });
}


// 4️⃣ 获取测量站的地理坐标
function getStationCoordinates(stationId) {
    if (!stationCoords[stationId]) {
        console.warn(`⚠️ Keine Koordinaten für ${stationId} gefunden, Standardwert wird verwendet。`);
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
