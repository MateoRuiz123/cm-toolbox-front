import type { FocusEvent, MouseEvent, RefAttributes } from "react";
import { Link, useLocation, type LinkProps } from "react-router";
import { preloadRouteChunk } from "../lib/route-preload";
import { useTransitionNavigate } from "../lib/use-transition-navigate";

export type TransitionLinkProps = LinkProps &
  RefAttributes<HTMLAnchorElement> & {
    readonly skipViewTransition?: boolean;
  };

const isModifiedEvent = (event: MouseEvent<HTMLAnchorElement>): boolean =>
  Boolean(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

/**
 * Enlace declarativo sobre `<Link>` que precarga el chunk destino al pasar el puntero o enfocar,
 * y coordina la transición de vista al navegar dentro de la SPA.
 */
export const TransitionLink = ({
  to,
  replace,
  state,
  preventScrollReset,
  relative,
  target,
  reloadDocument,
  skipViewTransition = false,
  onClick,
  onMouseEnter,
  onFocus,
  ...rest
}: TransitionLinkProps) => {
  const location = useLocation();
  const transitionNavigate = useTransitionNavigate();

  const handleMouseEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    onMouseEnter?.(event);
    void preloadRouteChunk(to, location.pathname);
  };

  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    onFocus?.(event);
    void preloadRouteChunk(to, location.pathname);
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      isModifiedEvent(event) ||
      (target && target !== "_self") ||
      reloadDocument ||
      skipViewTransition
    ) {
      return;
    }

    event.preventDefault();
    transitionNavigate(to, {
      replace,
      state,
      preventScrollReset,
      relative,
    });
  };

  return (
    <Link
      to={to}
      replace={replace}
      state={state}
      preventScrollReset={preventScrollReset}
      relative={relative}
      target={target}
      reloadDocument={reloadDocument}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...rest}
    />
  );
};
