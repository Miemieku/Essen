const API_BASE_URL = "https://datenplattform-essen.netlify.app/.netlify/functions/ubaProxy?";
let stationCoords = {}; // 存储Essen的测量站点

// 1️⃣ 获取测量站坐标（Essen）
function fetchStationCoordinates() {
    const apiUrl = `${API_BASE_URL}api=stationCoordinates`;

    return fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Netzwerkantwort war nicht ok');
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.data) {
                throw new Error('Ungültige Datenstruktur');
            }

            console.log("📌 Alle Messstationen Daten:", data);

            // 🚀 **确保 `data.data` 是数组**
            let stations = Array.isArray(data.data) ? data.data : Object.values(data.data);

            // 过滤出 Essen 
            let filteredStations = stations.filter(entry => entry[3] === "Essen"); // `3` 是城市名称字段

            if (filteredStations.length === 0) {
                console.warn("⚠️ Keine Messstationen für Essen gefunden!");
                return;
            }

            filteredStations.forEach(entry => {
                let stationId = entry[1];  // Code，例如 "DENW134"
                let city = entry[3];        // 城市名 "Essen"
                let lat = parseFloat(entry[8]); // 纬度
                let lon = parseFloat(entry[7]); // 经度

                stationCoords[stationId] = { city, lat, lon };
            });

            console.log("📍 Stationen in Essen gespeichert:", stationCoords);
        })
        .catch(error => {
            console.error('Fehler beim Abrufen der Messstationen:', error);
        });
}

// 2️⃣ 获取当前时间
function getCurrentTime() {
    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
    let hour = now.getHours() - 1; // 🚀 取上一个小时的数据

    if (hour < 0) {
        hour = 23; // 取前一天的 23:00 数据
        date = new Date(now.setDate(now.getDate() - 1)).toISOString().split("T")[0]; // 取前一天的日期
    }
    return { date, hour };
}

// 3️⃣ 获取空气质量数据
function fetchAirQualityData(stationId) {
    const { date, hour } = getCurrentTime();
    const apiUrl = `${API_BASE_URL}api=airQuality&date_from=${date}&date_to=${date}&time_from=${hour}&time_to=${hour}&station=${stationId}`;

    console.log(`📡 API Anfrage für ${stationId}: ${apiUrl}`);

    return fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            console.log(`📌 API Antwort für ${stationId}:`, data);

            if (!data || !data.data) {
                console.warn(`⚠️ Keine Luftqualitätsdaten für ${stationId}`);
                return null;
            }

            const actualStationId = Object.keys(data.data)[0]; // 确保 ID 正确
            console.log(`✅ Station ID Mapping: ${stationId} → ${actualStationId}`);

            return { stationId: actualStationId, data: data.data[actualStationId] };
        })
        .catch(error => {
            console.error(`❌ Fehler beim Laden der Luftqualität für ${stationId}:`, error);
            return null;
        });
}

// 4️⃣ 在地图上添加测量站点
function addStationsToMap() {
    Object.keys(stationCoords).forEach(stationId => {
        fetchAirQualityData(stationId).then(result => {
            if (!result || !result.data) {
                console.warn(`⚠️ Keine Luftqualitätsdaten für ${stationId}`);
                return;
            }

            let actualStationId = result.stationId;
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

            let latLng = [stationCoords[stationId].lat, stationCoords[stationId].lon];
            let marker = L.marker(latLng).bindPopup(popupContent);

            if (!marker) {
                console.error(`❌ Fehler: Marker für ${stationId} ist undefined`);
                return;
            }

            console.log(`📍 Station ${actualStationId} Marker erstellt:`, marker);
            marker.on("click", () => showDataInPanel(actualStationId, latestTimestamp, pollutantData));
            marker.addTo(map);
            mapMarkers[actualStationId] = marker;
        });
    });
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

// 6️⃣ 监听 `Luftqualität` 复选框
document.addEventListener("DOMContentLoaded", function () {
    fetchStationCoordinates().then(() => {
        document.getElementById("air-quality").addEventListener("change", function () {
            if (this.checked) {
                addStationsToMap();
            } else {
                Object.keys(mapMarkers).forEach(stationId => map.removeLayer(mapMarkers[stationId]));
                mapMarkers = {};
            }
        });
    });
});