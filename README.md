# Clima con Gracia

## API

Documentación mínima para el uso de la API:

### Introducción
Esta API proporciona datos climáticos relevantes para tu aplicación.

### Cómo usar
1. **Base URL**: `https://api.climacongracia.com`
2. **Ejemplo de endpoint**: `/weather?city=Ciudad`
   - Método: `GET`
   - Parámetros:
     - `city` (requerido): Nombre de la ciudad para la que deseas obtener los datos climáticos.

### Respuesta
Un ejemplo de respuesta en JSON:
```json
{
  "city": "Madrid",
  "temperature": 23,
  "description": "Cielo despejado"
}
```

### Contacto
Si tienes preguntas o problemas, abre un issue en este repositorio.