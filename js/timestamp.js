// timestamp.js
// @pulsekinesis

document.addEventListener("infobox:open", (e) => {
    if (document.getElementById("timestamp") == null) return;
    
    const locale = navigator.language || "en-US";

    function updateCentralStandardTime() {
        const newTime = new Date().toLocaleString(locale, {
            timeZone: "America/Chicago",
            weekday: "long",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
        })

        document.getElementById("timestamp").textContent = newTime;
    }

    updateCentralStandardTime();
    setInterval(updateCentralStandardTime, 1000);
});
