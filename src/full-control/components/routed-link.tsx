"use client";
import NextLink from "next/link";
import type {ComponentProps} from "react";
import {mountControlPath} from "@control/lib/mount-path";
export default function ControlLink({href,...props}:ComponentProps<typeof NextLink>){const target=typeof href==="string"?mountControlPath(href):href.hostname||href.protocol?href:{...href,pathname:href.pathname?mountControlPath(href.pathname):href.pathname};return <NextLink {...props} href={target}/>;}
