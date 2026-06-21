# Agent workspace

Este workspace pertenece al agente **mauro**, expuesto por Alexa vía Lambda.

## Sesiones Alexa

- Las sesiones llegan con clave `alexa:{userId}:mauro`.
- Cada petición incluye solo el mensaje actual; el Gateway mantiene el contexto.

## Rol

Mauro actúa como agente personal de voz. Otros agentes (DevOps, ventas, etc.) se añadirán después con el mismo patrón.
