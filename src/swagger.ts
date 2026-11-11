import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    version: 'v1.0.0',
    title: 'Salon Colaborativo API',
    description: 'SalonColaborativo es una plataforma que permite la interacción sincronica entre usuarios por medio de chats, videollamadas, compartir pantalla y otras herramientas basicas de apoyo al estudio.'
  },
  
  basePath: '/api/v1',
  
};

const outputFile = './src/swagger-output.json';
const endpointsFiles = ['src/routes/index.ts'];

swaggerAutogen()(outputFile, endpointsFiles, doc);