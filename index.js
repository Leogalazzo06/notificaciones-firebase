import fetch from "node-fetch";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

console.log("🔥 Escuchando pedidos...");

let initialized = false;

db.collection("orders").onSnapshot((snap) => {
  if (!initialized) {
    initialized = true;
    return;
  }

  snap.docChanges().forEach(async (change) => {
    if (change.type === "added") {
      const pedido = change.doc.data();

      const nombre = pedido.nombre || "Cliente";
      const total = Number(pedido.total || 0).toLocaleString("es-AR");
      const cantItems = (pedido.items || []).length;
      const itemsTxt = cantItems === 1 ? "1 producto" : `${cantItems} productos`;

      const mensaje = `🛍 ${nombre} - $${total} - ${itemsTxt}`;

      console.log("🛒 Nuevo pedido:", mensaje);

      await fetch("https://ntfy.sh/Carlo_essential", {
        method: "POST",
        headers: {
          "Title": "Nuevo pedido en tu tienda",
          "Priority": "high",
          "Tags": "shopping,bell",
          "Content-Type": "text/plain"
        },
        body: mensaje
      });
    }
  });
});