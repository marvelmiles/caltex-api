export const setFutureDate = days => {
  return new Date(new Date().getTime() + days * 86400000);
};

export const getDaysDifference = (startDate, endDate) => {
  const utcStartDate = new Date(startDate.toISOString().substring(0, 10));
  const utcEndDate = new Date(endDate.toISOString().substring(0, 10));

  return Math.floor((utcEndDate - utcStartDate) / (1000 * 60 * 60 * 24));
};
