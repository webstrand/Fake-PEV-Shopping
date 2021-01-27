const getResMock = () => {
  const jsonMethod = jest.fn((errorObj) => {});
  const statusMethod = jest.fn((code) => ({ json: jsonMethod }));

  return {
    status: statusMethod,
    _jsonMethod: jsonMethod,
  };
};

module.exports = { getResMock };
