import client from './client';

export const getListings = async (params = {}) => {
  return await client.get('/listings', { params });
};

export const getListing = async (id) => {
  return await client.get(`/listings/${id}`);
};

export const createListing = async (data) => {
  return await client.post('/listings', data);
};

export const updateListing = async (id, data) => {
  return await client.patch(`/listings/${id}`, data);
};

export const cancelListing = async (id) => {
  return await client.patch(`/listings/${id}/cancel`);
};

export const getListingReservations = async (id) => {
  return await client.get(`/listings/${id}/reservations`);
};

export const createReservation = async (listingId, data) => {
  return await client.post(`/listings/${listingId}/reservations`, data);
};
