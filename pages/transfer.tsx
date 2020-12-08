import React from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import HtanNavbar from '../components/HtanNavbar';
import Footer from '../components/Footer';
import { GetServerSideProps, GetStaticProps } from 'next';
import fetch from 'node-fetch';
import { CmsData } from '../types';
import { WORDPRESS_BASE_URL } from '../ApiUtil';

export interface TransferProps {
    data: CmsData[];
}

const Transfer = (data: TransferProps) => {
    return (
        <>
            <HtanNavbar />
            <Container>
                <Row>
                    <Breadcrumb className="mt-3">
                        <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
                        <Breadcrumb.Item active>Data Transfer</Breadcrumb.Item>
                    </Breadcrumb>
                </Row>
                <Row className="mt-3">
                    <h1>Data Transfer</h1>
                </Row>
                <Row className="mt-3">
                    <span
                        dangerouslySetInnerHTML={{
                            __html: data.data[0].content.rendered,
                        }}
                    />
                </Row>
            </Container>
            <Footer />
        </>
    );
};

export const getStaticProps: GetStaticProps = async (context) => {
    let slugs = ['summary-blurb-data-transfer'];
    let overviewURL = `${WORDPRESS_BASE_URL}${JSON.stringify(slugs)}`;
    let res = await fetch(overviewURL);
    let data = await res.json();
    return { props: { data } };
};

export default Transfer;
