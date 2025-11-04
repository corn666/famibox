import { useEffect, useRef, useState } from 'react';

// Variable globale pour stocker quelle navigation est actuellement active
let activeNavigationId = null;

const useTVNavigation = (containerRef, options = {}) => {
  const {
    enabled = true,
    onBack = null,
    initialFocusIndex = 0,
    focusClass = 'tv-focused',
    priority = 0 // Plus le nombre est élevé, plus la priorité est haute
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(initialFocusIndex);
  const navigableElements = useRef([]);
  const navigationId = useRef(Math.random().toString(36)); // ID unique pour cette instance

  // Mettre à jour la liste des éléments navigables
  const updateNavigableElements = () => {
    if (!containerRef.current) return;
    
    const elements = containerRef.current.querySelectorAll('[data-tv-navigable]');
    navigableElements.current = Array.from(elements).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  };

  // Vérifier si cette navigation est active (a le focus)
  const isActive = () => {
    return enabled && (activeNavigationId === navigationId.current || activeNavigationId === null);
  };

  // Prendre le contrôle de la navigation
  const takeControl = () => {
    if (enabled) {
      activeNavigationId = navigationId.current;
      console.log('🎮 Navigation active:', navigationId.current.substring(0, 8));
    }
  };

  // Libérer le contrôle
  const releaseControl = () => {
    if (activeNavigationId === navigationId.current) {
      activeNavigationId = null;
      console.log('🎮 Navigation désactivée:', navigationId.current.substring(0, 8));
    }
  };

  // Calculer l'élément le plus proche dans une direction
  const findNearestElement = (currentIndex, direction) => {
    if (navigableElements.current.length === 0) return currentIndex;
    
    const current = navigableElements.current[currentIndex];
    if (!current) return 0;
    
    const currentRect = current.getBoundingClientRect();
    const currentCenter = {
      x: currentRect.left + currentRect.width / 2,
      y: currentRect.top + currentRect.height / 2
    };

    let bestIndex = currentIndex;
    let bestDistance = Infinity;

    navigableElements.current.forEach((element, index) => {
      if (index === currentIndex) return;
      
      const rect = element.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      let isValidDirection = false;
      let distance = 0;

      switch (direction) {
        case 'up':
          isValidDirection = center.y < currentCenter.y - 10;
          distance = Math.sqrt(
            Math.pow(center.x - currentCenter.x, 2) + 
            Math.pow(center.y - currentCenter.y, 2)
          );
          if (Math.abs(center.x - currentCenter.x) < 50) distance *= 0.7;
          break;
        case 'down':
          isValidDirection = center.y > currentCenter.y + 10;
          distance = Math.sqrt(
            Math.pow(center.x - currentCenter.x, 2) + 
            Math.pow(center.y - currentCenter.y, 2)
          );
          if (Math.abs(center.x - currentCenter.x) < 50) distance *= 0.7;
          break;
        case 'left':
          isValidDirection = center.x < currentCenter.x - 10;
          distance = Math.sqrt(
            Math.pow(center.x - currentCenter.x, 2) + 
            Math.pow(center.y - currentCenter.y, 2)
          );
          if (Math.abs(center.y - currentCenter.y) < 50) distance *= 0.7;
          break;
        case 'right':
          isValidDirection = center.x > currentCenter.x + 10;
          distance = Math.sqrt(
            Math.pow(center.x - currentCenter.x, 2) + 
            Math.pow(center.y - currentCenter.y, 2)
          );
          if (Math.abs(center.y - currentCenter.y) < 50) distance *= 0.7;
          break;
        default:
          break;
      }

      if (isValidDirection && distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  };

  // Gérer la navigation
  const handleKeyDown = (e) => {
    // Ne traiter les événements que si cette navigation est active
    if (!isActive()) return;
    
    if (navigableElements.current.length === 0) return;

    let newIndex = focusedIndex;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        newIndex = findNearestElement(focusedIndex, 'up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        newIndex = findNearestElement(focusedIndex, 'down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        newIndex = findNearestElement(focusedIndex, 'left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        newIndex = findNearestElement(focusedIndex, 'right');
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (navigableElements.current[focusedIndex]) {
          navigableElements.current[focusedIndex].click();
        }
        return;
      case 'Backspace':
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (onBack) onBack();
        return;
      default:
        return;
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
    }
  };

  // Appliquer le focus visuel
  useEffect(() => {
    if (!enabled) return;
    
    updateNavigableElements();
    
    // Retirer le focus de tous les éléments
    document.querySelectorAll(`.${focusClass}`).forEach(el => {
      el.classList.remove(focusClass);
    });
    
    // Appliquer le focus uniquement si cette navigation est active
    if (isActive() && navigableElements.current[focusedIndex]) {
      const element = navigableElements.current[focusedIndex];
      element.classList.add(focusClass);
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedIndex, enabled, focusClass]);

  // Prendre ou libérer le contrôle quand enabled change
  useEffect(() => {
    if (enabled) {
      takeControl();
      updateNavigableElements();
    } else {
      releaseControl();
      // Retirer le focus de tous les éléments de ce container
      if (containerRef.current) {
        containerRef.current.querySelectorAll(`.${focusClass}`).forEach(el => {
          el.classList.remove(focusClass);
        });
      }
    }

    return () => {
      releaseControl();
    };
  }, [enabled]);

  // Observer les changements du DOM
  useEffect(() => {
    if (!containerRef.current || !enabled) return;

    const observer = new MutationObserver(() => {
      updateNavigableElements();
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true
    });

    updateNavigableElements();

    return () => observer.disconnect();
  }, [containerRef, enabled]);

  // Attacher les événements clavier
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown, true); // useCapture = true pour priorité
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled, focusedIndex, onBack]);

  return {
    focusedIndex,
    setFocusedIndex,
    navigableElements: navigableElements.current
  };
};

export default useTVNavigation;