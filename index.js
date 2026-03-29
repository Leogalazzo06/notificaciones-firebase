import fetch from "node-fetch";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Validamos que la variable de entorno exista para evitar errores al arrancar
if (!process.env.FIREBASE_KEY) {
  console.error("❌ Error: No se encontró la variable FIREBASE_KEY");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

console.log("🔥 Escuchando nuevos pedidos para Carlo Essential...");

let initialized = false;

db.collection("orders").onSnapshot(async (snap) => {
  // Ignoramos la carga inicial de documentos existentes
  if (!initialized) {
    initialized = true;
    return;
  }

  // Usamos for...of en lugar de forEach para manejar mejor el async/await
  for (const change of snap.docChanges()) {
    if (change.type === "added") {
      const pedido = change.doc.data();

      const nombre = pedido.nombre || "Cliente";
      const total = Number(pedido.total || 0).toLocaleString("es-AR");
      const cantItems = (pedido.items || []).length;
      const itemsTxt = cantItems === 1 ? "1 producto" : `${cantItems} productos`;

      const mensaje = `🛍 ${nombre} - $${total} (${itemsTxt})`;

      console.log("🛒 Nuevo pedido detectado:", mensaje);

      try {
        const response = await fetch("https://ntfy.sh/Carlo_essential", {
          method: "POST",
          headers: {
            "Title": "¡Nuevo pedido en Carlo Essential!",
            "Priority": "high",
            "Tags": "shopping_bags,moneybag",
            "Content-Type": "text/plain; charset=utf-8"
          },
          // Aquí integramos el mensaje que armaste arriba
          body: `${mensaje}\nIngresá al panel para gestionarlo.`
        });

        if (response.ok) {
          console.log("✅ Notificación enviada correctamente.");
        } else {
          console.error("⚠️ Error en ntfy:", response.statusText);
        }
      } catch (error) {
        console.error("❌ Error al conectar con ntfy:", error.message);
      }
    }
  }
});
