import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    version: 'v1.0.0',
    title: 'Salon Colaborativo API',
    description: 'SalonColaborativo es una plataforma que permite la interacción sincronica entre usuarios por medio de chats, videollamadas, compartir pantalla y otras herramientas basicas de apoyo al estudio.\n\nAutenticación: inicia sesión en el frontend con Firebase (correo o Google) y envía el ID token en `Authorization: Bearer <token>`. En Swagger usa el botón **Authorize**.'
  },
  basePath: '/api/v1',
  tags: [
    { name: 'Sistema', description: 'Estado del servicio' },
    { name: 'Usuarios', description: 'Perfiles de usuario (requieren sesión)' },
    { name: 'Mensajes', description: 'Consulta de mensajes (requieren sesión)' }
  ],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'Escribe: Bearer <ID token de Firebase>'
    }
  },
  definitions: {
    Error: { error: 'no autorizado' },
    ErrorValidacion: {
      error: 'Datos inválidos',
      details: [{ field: 'username', message: 'El nombre de usuario ya está en uso' }]
    },
    CrearPerfil: {
      $username: 'nico_dev',
      $displayName: 'Nicolás Mosorongo',
      photoURL: 'https://example.com/foto.png',
      bio: 'Estudiante de Univalle'
    },
    ActualizarPerfil: {
      username: 'nico_dev',
      displayName: 'Nicolás Mosorongo',
      photoURL: 'https://example.com/foto.png',
      bio: 'Estudiante de Univalle'
    },
    Perfil: {
      uid: 'k3J9...firebase-uid',
      email: 'nico@correo.com',
      username: 'nico_dev',
      displayName: 'Nicolás Mosorongo',
      photoURL: 'https://example.com/foto.png',
      bio: 'Estudiante de Univalle',
      provider: 'password',
      createdAt: '2026-11-12T15:00:00.000Z',
      updatedAt: '2026-11-12T15:00:00.000Z'
    }
  }
};

const outputFile = './src/swagger-output.json';
const endpointsFiles = ['src/routes/index.ts'];

swaggerAutogen({ autoHeaders: false })(outputFile, endpointsFiles, doc);