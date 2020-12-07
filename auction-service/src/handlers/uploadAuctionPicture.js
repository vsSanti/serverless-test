import middy from '@middy/core';
import validator from '@middy/validator';
import httpErrorHandler from '@middy/http-error-handler';
import createError from 'http-errors';

import { getAuctionById } from './getAuction';
import { setAuctionPictureUrl } from '../../lib/setAuctionPictureUrl';
import { uploadPictureToS3 } from '../../lib/uploadPictureToS3';
import uploadAuctionPictureSchema from '../../lib/schemas/uploadAuctionPictureSchema';

async function uploadAuctionPicture(event) {
  const { id } = event.pathParameters;
  const { email } = event.requestContext.authorizer;

  const auction = await getAuctionById(id);

  if (email !== auction.seller) {
    throw new createError.Forbidden('You are not the seller of this auction!');
  }

  let updatedAuction;

  try {
    const base64 = event.body.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    const pictureUrl = await uploadPictureToS3(`${auction.id}.jpg`, buffer);
    updatedAuction = await setAuctionPictureUrl(auction, pictureUrl);

  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = middy(uploadAuctionPicture)
  .use(httpErrorHandler())
  .use(validator({ inputSchema: uploadAuctionPictureSchema }));