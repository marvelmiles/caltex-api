export default (app, port = 8080) => {
  app.listen(port, () => console.log(`App listening on port ${port}`));
};
