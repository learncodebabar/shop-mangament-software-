import React from "react";

function BackupButton() {
  const handleBackup = async () => {
    try {
      const res = await fetch("http://127.0.0.1:3000/api/backup/download");
      const blob = await res.blob();

      // Create temporary link to download zip
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Backup failed: " + err.message);
    }
  };

  return <button className="btn btn-outline-warning btn-lg px-5" onClick={handleBackup}>Backup Now</button>;
}

export default BackupButton;
