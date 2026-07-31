import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import card01002 from '../../../../../public/assets/cards/01/002.json';
import card01119 from '../../../../../public/assets/cards/01/119.json';
import card02107 from '../../../../../public/assets/cards/02/107.json';
import card02126 from '../../../../../public/assets/cards/02/126.json';
import card02200 from '../../../../../public/assets/cards/02/200.json';
import card02314 from '../../../../../public/assets/cards/02/314.json';
import card09045 from '../../../../../public/assets/cards/09/045.json';
import card10095 from '../../../../../public/assets/cards/10/095.json';

const cardAssets: Readonly<Record<string, unknown>> = {
  '/assets/cards/01/002.json': card01002,
  '/assets/cards/01/119.json': card01119,
  '/assets/cards/02/107.json': card02107,
  '/assets/cards/02/126.json': card02126,
  '/assets/cards/02/200.json': card02200,
  '/assets/cards/02/314.json': card02314,
  '/assets/cards/09/045.json': card09045,
  '/assets/cards/10/095.json': card10095,
};

export const serveCardAssets: HttpInterceptorFn = (req, next) => {
  const asset = cardAssets[req.url];
  if (req.method === 'GET' && asset) {
    return of(new HttpResponse({ status: 200, body: asset }));
  }

  return next(req);
};
