const generateLobbyId = (): string => {
  const numbers = '0123456789';
  let randomNumbers = '';
  while (randomNumbers.length < 6) {
    randomNumbers += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return randomNumbers;
};

export default generateLobbyId;
