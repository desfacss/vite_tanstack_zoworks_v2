import { Button } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';

const Planner: React.FC = () => {
  return (
    <div>
      <Link to={'/planner'}>
        <Button type='primary'>Planner</Button>
      </Link>
    </div>
  );
};

export default Planner;