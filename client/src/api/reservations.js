import client from './client';

export const lookupReservation = async (contact, pickupCode) => {
  return await client.get('/reservations/lookup', {
    params: {
      contact: contact ? contact.trim().toLowerCase() : '',
      pickupCode: pickupCode ? pickupCode.trim().toUpperCase() : ''
    }
  });
};

export const cancelReservation = async (id, pickupCode) => {
  return await client.patch(`/reservations/${id}/cancel`, {
    pickupCode: pickupCode ? pickupCode.trim().toUpperCase() : undefined
  });
};

export const collectReservation = async (id, pickupCode) => {
  return await client.patch(`/reservations/${id}/collect`, {
    pickupCode: pickupCode ? pickupCode.trim().toUpperCase() : undefined
  });
};
