import os
import sys
from db_helper import log_atensi, register_student_only

def test():
    print("Testing register student...")
    register_student_only("99999", "Test User")
    
    print("Testing log atensi...")
    log_atensi("50633", "99999", 30, "MENGANTUK", "Test")
    
if __name__ == '__main__':
    test()
