import * as React from 'react';
import { Link } from "react-router-dom";


export function NotFound() {
  return (
    <div>
      <h1>Not Found</h1>
      <Link to="/">Back Home</Link>
    </div>
  );
}
