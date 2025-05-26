export const calculateNextMonthDate = (currentDate: Date) => {
    const day = currentDate.getDate();
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }

    const nextDate = new Date(nextYear, nextMonth, day);
    if (nextDate.getMonth() !== nextMonth) {
      return new Date(nextYear, nextMonth + 1, 0); // Pone el día a 0 para obtener el último día del mes anterior
    }

    return nextDate;
  }