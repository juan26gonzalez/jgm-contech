# 🏢 JGM ConTech | Plataforma Gerencial BIM 3D/4D/5D & Control Financiero

![Next.js](https://img.shields.io/badge/Next.js-14-0f172a.svg)
![Python](https://img.shields.io/badge/Python-Serverless_APIs-blue.svg)
![Supabase](https://img.shields.io/badge/Supabase-Auth_&_Cloud-3ECF8E.svg)
![Three.js](https://img.shields.io/badge/Three.js-OpenBIM_IFC-0696D7.svg)
![Pandas](https://img.shields.io/badge/Pandas-EVM_Analytics-150458.svg)

Plataforma ejecutiva **ConTech (Construction Technology)** para dirección técnica, modelado de costos BIM 5D, programación 4D y control financiero en proyectos de ingeniería civil y edificación.

Operando con **proyectos prototipo y modelos demostrativos** de libre exploración (**Modo Demo Sandbox**), además de arquitectura configurable con variables de entorno para instancias privadas conectadas a **Supabase Cloud** y **JGM ConTech Bitácora**.

---

## 🧩 Módulos y Capacidades Técnicas

* **📐 Visor 3D BIM & OpenBIM IFC (`Three.js` + `web-ifc`):** Inspección geométrica, carga privada de modelos `.ifc` desde el navegador, trazabilidad de acero estructural (NSR-10 / ACI 318) y cruce contra ítems APU.
* **💰 Presupuesto APU & Consolidación 5D (`TypeScript` + `Python / Pandas`):** Matriz contractual, desviaciones, alertas de mayores cantidades, actas de cobro y generación de informes PDF/Excel en memoria.
* **📈 Curva S & Programación 4D (`MS Project XML / VBA`):** Importación local de cronogramas `.xml`, cálculo de Valor Ganado (EVM: `PV`, `EV`, `AC`, `SPI`, `CPI`) y ruta crítica.
* **🏘️ Despiece por Zonas / Habitaciones Revit:** Simulador presupuestal por espacios e importación local de tablas de planificación (`.txt` / `.csv`).
* **🛡️ ERP de Obra:** Control de nómina y destajo, órdenes de compra a proveedores, cartera de clientes y matriz SST.

---

## 🔐 Privacidad y Configuración de Entorno (`Vercel / Local`)

Este repositorio **no incluye** planos contractuales reales, firmas digitalizadas, documentos de identidad ni credenciales privadas de bases de datos.

- **Modo Demo (Sin credenciales):** La plataforma inicia completamente funcional en **Modo Demo Showcase (Solo Lectura)** utilizando modelos prototipo y datos sintéticos.
- **Modo Cloud Privado:** Para conectar tu propia instancia de **Supabase**, define las variables indicadas en `vercel-app/.env.example`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_BITACORA_APP_URL` *(opcional)*

---

**Arquitectura ConTech • ISO 19650 • BIM 3D / 4D / 5D**
